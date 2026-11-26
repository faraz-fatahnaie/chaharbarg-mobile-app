import { useSyncExternalStore } from 'react';
import type { MatchState } from '@chaharbarg/engine';
import {
  ACHIEVEMENTS, cleanAvatar, cleanStats, createProfile, migrateSettings, verifyProfile, type LedgerEntry, type Profile,
} from '../economy/economy';
import { fixMatchTarget } from './match';
import { isPhotoDataUrl } from './identity';
import { cleanStages } from '../data/stages';
import { HONORS } from '../data/honors';
import { ARENAS } from '../data/arenas';
import { COSMETICS, type CosmeticKind } from '../data/cosmetics';

// ponytail: localStorage is enough for a profile + 40-entry ledger; move to SQLite (Capacitor) if saves grow or the OS evicts it.
const KEY = 'chaharbarg.profile.v1';
const MATCH_KEY = 'chaharbarg.match.v1';

const BAK_KEY = 'chaharbarg.profile.v1.bak';

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const nat = (x: unknown) => (fin(x) && x > 0 ? Math.floor(x) : 0);
const str = (x: unknown, d = '') => (typeof x === 'string' ? x : d);
const strs = (x: unknown, ok: (s: string) => boolean = () => true) =>
  Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === 'string' && ok(s)))] : [];
const okEntry = (e: unknown): e is LedgerEntry =>
  isObj(e) && (['t', 'dS', 'dG', 's', 'g'] as const).every((k) => fin(e[k])) && (['reason', 'prev', 'h'] as const).every((k) => typeof e[k] === 'string');

/** Format migrations by saved version; v1 is current. Add `if (r.v === 1) { ...; r.v = 2; }` steps here. */
function migrate(r: Record<string, unknown>): Record<string, unknown> {
  if (r.v === undefined) r.v = 1;
  if (r.v !== 1) throw new Error(`unknown profile version ${String(r.v)}`);
  return r;
}

/** Rebuilds a saved profile field by field on top of fresh defaults, so one bad field never costs the rest. */
export function profileFromSaved(saved: unknown, now: number): Profile {
  if (!isObj(saved)) throw new Error('profile is not an object');
  const r = migrate({ ...saved });
  const d = createProfile(now);
  const ledgerIn = Array.isArray(r.ledger) ? r.ledger : [];
  const bad = ledgerIn.findIndex((e) => !okEntry(e));
  const ledger = (bad < 0 ? ledgerIn : ledgerIn.slice(0, bad)) as LedgerEntry[];
  const owned = [...new Set([...d.owned, ...strs(r.owned, (id) => COSMETICS.some((c) => c.id === id))])];
  const eq = isObj(r.equipped) ? r.equipped : {};
  const equipped = { ...d.equipped };
  for (const k of Object.keys(equipped) as CosmeticKind[]) {
    const id = eq[k];
    if (typeof id === 'string' && owned.includes(id) && COSMETICS.some((c) => c.id === id && c.kind === k)) equipped[k] = id;
  }
  const daily = isObj(r.daily) ? r.daily : {};
  const progress = isObj(daily.progress) ? Object.fromEntries((['games', 'wins', 'surs'] as const).map((k) => [k, nat((daily.progress as Record<string, unknown>)[k])])) : {};
  const ads = isObj(r.ads) ? r.ads : {};
  const login = isObj(r.login) ? r.login : {};
  const p: Profile = {
    ...d,
    name: str(r.name),
    // a missing balance cannot match the ledger head, so verifyProfile restores it from there
    shahi: fin(r.shahi) ? r.shahi : -1,
    gohar: fin(r.gohar) ? r.gohar : -1,
    trophies: nat(r.trophies),
    xp: nat(r.xp),
    stats: cleanStats(r.stats),
    owned,
    equipped,
    settings: migrateSettings(r.settings),
    login: { last: str(login.last), streak: nat(login.streak) },
    daily: { date: str(daily.date), progress, claimed: strs(daily.claimed) },
    ads: { day: str(ads.day), watched: nat(ads.watched), lastAt: Math.min(nat(ads.lastAt), now) },
    reliefAt: Math.min(nat(r.reliefAt), now), // a future value must not lock relief
    achievements: strs(r.achievements, (id) => ACHIEVEMENTS.some((a) => a.id === id)),
    purchases: strs(r.purchases).slice(-200),
    tutorialDone: r.tutorialDone === true,
    stages: cleanStages(r.stages),
    title: HONORS.some((h) => h.id === r.title) ? (r.title as string) : null,
    avatar: cleanAvatar(r.avatar),
    tampered: nat(r.tampered),
    lastSeen: nat(r.lastSeen),
    ledger,
  };
  const q = verifyProfile(p, now);
  // after verification the ledger head's time is hash-protected; the saved lastSeen is not
  return { ...q, lastSeen: Math.max(q.lastSeen, nat(q.ledger.at(-1)?.t)) };
}

function backup(raw: string) {
  try { localStorage.setItem(BAK_KEY, raw); } catch { /* quota: nothing more we can do */ }
}

function load(): Profile {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw) return profileFromSaved(JSON.parse(raw), Date.now());
  } catch {
    // corrupt or from an unknown version: keep a copy before persist() overwrites it, then start fresh
    if (raw) backup(raw);
  }
  return createProfile(Date.now());
}

let profile = load();
const subs = new Set<() => void>();

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* private mode / quota */
  }
};

export const getProfile = () => profile;

export function update(fn: (p: Profile) => Profile) {
  profile = fn(profile);
  persist();
  subs.forEach((s) => s());
}

export const useProfile = () =>
  useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => profile);

// ---- profile picture: its own key, never part of Profile ----
const PHOTO_KEY = 'chaharbarg.photo.v1';

function loadPhoto(): string | null {
  try {
    const v = localStorage.getItem(PHOTO_KEY);
    return isPhotoDataUrl(v) ? v : null;
  } catch {
    return null;
  }
}

let photo = loadPhoto();
const photoSubs = new Set<() => void>();

export const getPhoto = () => photo;
export const usePhoto = () =>
  useSyncExternalStore((cb) => { photoSubs.add(cb); return () => photoSubs.delete(cb); }, () => photo);

export function setPhoto(dataUrl: string | null): boolean {
  if (dataUrl !== null && !isPhotoDataUrl(dataUrl)) return false;
  try {
    if (dataUrl === null) localStorage.removeItem(PHOTO_KEY);
    else localStorage.setItem(PHOTO_KEY, dataUrl);
  } catch {
    return false;
  }
  photo = dataUrl;
  photoSubs.forEach((s) => s());
  return true;
}

// ---- in-progress match (resume after the app is closed) ----
export interface SeatInfo { name: string; botId: string | null; hue: number; glyph?: string }
export interface MatchCtx {
  match: MatchState;
  arenaId: string;
  seats: SeatInfo[];
  mode: 'bots' | 'pnp';
  paid: boolean;
  fee: number;
  tod: 'day' | 'dusk' | 'night';
  /** set when the match is a solo stage (data/stages.ts) */
  stageId?: string;
}

export function saveMatch(c: MatchCtx | null) {
  try {
    if (c) localStorage.setItem(MATCH_KEY, JSON.stringify(c));
    else localStorage.removeItem(MATCH_KEY);
  } catch {
    /* ignore */
  }
}

/** Shape check for a saved match: enough that resuming cannot crash on missing parts. */
function validCtx(c: unknown): c is MatchCtx {
  const x = c as MatchCtx | null;
  const n = x?.match?.config?.players;
  if (!((n === 2 || n === 3 || n === 4) && !!x!.match.deal && Array.isArray(x!.seats) && x!.seats.length === n
    && (x!.mode === 'bots' || x!.mode === 'pnp'))) return false;
  // the saved fee sets the payout: it must be exactly what this arena charges (0 for free games)
  const arena = ARENAS.find((a) => a.id === x!.arenaId);
  if (!arena || typeof x!.paid !== 'boolean' || (x!.paid && x!.mode !== 'bots')) return false;
  return Number.isInteger(x!.fee) && x!.fee === (x!.paid ? arena.fee : 0);
}

export function loadMatch(): MatchCtx | null {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    const c: unknown = raw ? JSON.parse(raw) : null;
    return validCtx(c) ? fixMatchTarget(c) : null;
  } catch {
    return null;
  }
}

export function resetAll() {
  try {
    // every key the app writes starts with 'chaharbarg.' (profile, match, photo, online credential, server, mock store, prizes seen, backup)
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('chaharbarg.')) keys.push(k);
    }
    for (const k of [...keys, KEY, MATCH_KEY, PHOTO_KEY]) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  profile = createProfile(Date.now());
  persist();
  subs.forEach((s) => s());
  photo = null;
  photoSubs.forEach((s) => s());
}
