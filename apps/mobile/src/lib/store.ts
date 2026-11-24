import { useSyncExternalStore } from 'react';
import type { MatchState } from '@chaharbarg/engine';
import { createProfile, migrateSettings, verifyProfile, type Profile } from '../economy/economy';
import { fixMatchTarget } from './match';
import { isPhotoDataUrl } from './identity';
import { cleanStages } from '../data/stages';

// ponytail: localStorage is enough for a profile + 40-entry ledger; move to SQLite (Capacitor) if saves grow or the OS evicts it.
const KEY = 'chaharbarg.profile.v1';
const MATCH_KEY = 'chaharbarg.match.v1';

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Profile;
      const settings = migrateSettings(p.settings);
      // old builds stored 62 / 100 / 'single'; storage may also hold edited values
      const t: unknown = settings.target;
      settings.target = t === 'long' || t === 100 ? 'long' : 'short';
      return verifyProfile({ ...p, xp: Number.isFinite(p.xp) && p.xp > 0 ? Math.floor(p.xp) : 0, stages: cleanStages(p.stages), stats: { ...p.stats, byPlayers: p.stats?.byPlayers ?? {} }, settings }, Date.now());
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
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
export interface SeatInfo { name: string; botId: string | null; hue: number }
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
  return (n === 2 || n === 3 || n === 4) && !!x!.match.deal && Array.isArray(x!.seats) && x!.seats.length === n
    && typeof x!.arenaId === 'string' && (x!.mode === 'bots' || x!.mode === 'pnp');
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
    localStorage.removeItem(KEY);
    localStorage.removeItem(MATCH_KEY);
    localStorage.removeItem(PHOTO_KEY);
  } catch {
    /* ignore */
  }
  profile = createProfile(Date.now());
  persist();
  subs.forEach((s) => s());
  photo = null;
  photoSubs.forEach((s) => s());
}
