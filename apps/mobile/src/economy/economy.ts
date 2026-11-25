import { ARENAS, type Arena } from '../data/arenas';
import { STAGES } from '../data/stages';
import { COSMETICS, GOHAR_PACKS, type CosmeticKind } from '../data/cosmetics';
import { HONORS, type Honor, type HonorKind } from '../data/honors';
import { sha256 } from './sha256';

export const winRate = (wins: number, games: number): number => {
  const r = games > 0 ? Math.round((wins / games) * 100) : 0;
  return Number.isFinite(r) ? r : 0;
};

const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

export const cleanByPlayers = (raw: unknown): Stats['byPlayers'] => {
  const out: Stats['byPlayers'] = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  for (const k of ['2', '3', '4']) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v !== 'object' || v === null) continue;
    const o = v as Record<string, unknown>;
    const games = count(o.games);
    out[k] = { games, wins: Math.min(count(o.wins), games), surs: count(o.surs) };
  }
  return out;
};

/*
 * Economy rules (all client-side, offline-first):
 *  - Shahi (شاهی): soft coin. Earned by playing, daily rewards, challenges and rewarded ads. Never sold for money.
 *    Spent on arena entry fees. No cash-out of any kind.
 *  - Gohar (گوهر): premium currency. Sold in packs, also earned slowly (level-ups, achievements). Spent only on
 *    cosmetics. It can never be staked in a match.
 *  - Every balance change goes through applyDelta(), which appends a hash-chained ledger entry. On load,
 *    verifyProfile() detects a hand-edited balance or ledger and rolls back to the last valid entry.
 *    This stops casual editing only; real protection needs store-receipt checks (see docs/design.md §Economy).
 */

const SECRET = 'chq1:7f3a91c2'; // deterrent only: it ships inside the bundle

export interface LedgerEntry { t: number; reason: string; dS: number; dG: number; s: number; g: number; prev: string; h: string }

export interface Settings {
  lang: 'fa' | 'en';
  music: boolean;
  effects: boolean;
  notifications: boolean;
  hints: boolean;
  timeOfDay: 'auto' | 'day' | 'dusk' | 'night';
  target: 'short' | 'long';
  noSurInLastRound: boolean;
  mustCapture: boolean;
  openingJack: 'replace' | 'allow';
  surSarbazPoints: 5 | 10;
  /** per-turn limit vs bots: off, 15 s, or 5 s */
  turnTimer: 'off' | 'normal' | 'speed';
}

export interface Stats {
  games: number; wins: number; losses: number; draws: number;
  surs: number; sarbaz: number; streak: number; bestStreak: number;
  byArena: Record<string, { games: number; wins: number }>;
  /** keyed by player count: '2' | '3' | '4' */
  byPlayers: Record<string, { games: number; wins: number; surs: number }>;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Saved stats from storage: every counter a non-negative integer, groups kept only for known keys. */
export function cleanStats(raw: unknown): Stats {
  const r = isObj(raw) ? raw : {};
  const group = <K extends string>(g: unknown, keys: readonly K[], allowed?: readonly string[]) => {
    const out: Record<string, Record<K, number>> = {};
    if (isObj(g)) for (const [id, v] of Object.entries(g)) {
      if (allowed && !allowed.includes(id)) continue;
      const o = isObj(v) ? v : {};
      out[id] = Object.fromEntries(keys.map((k) => [k, count(o[k])])) as Record<K, number>;
    }
    return out;
  };
  return {
    games: count(r.games), wins: count(r.wins), losses: count(r.losses), draws: count(r.draws),
    surs: count(r.surs), sarbaz: count(r.sarbaz), streak: count(r.streak), bestStreak: count(r.bestStreak),
    byArena: group(r.byArena, ['games', 'wins'] as const, ARENAS.map((a) => a.id)),
    byPlayers: cleanByPlayers(r.byPlayers),
  };
}

export const AVATAR_GLYPHS = ['🦁', '🐺', '🦅', '🐉', '🌹', '🏺', '☀️', '🌙', ...['hafez', 'ferdowsi', 'khayyam', 'rumi', 'cyrus', 'rostam', 'arash', 'simurgh', 'lionsun', 'boteh', 'persepolis', 'azadi', 'siosepol', 'badgir', 'damavand', 'anar'].map((k) => `e:${k}`)] as const;
/** In-game avatar: a colour and an optional emoji (empty = first letter of the name). Separate from the profile picture. */
export interface Avatar { hue: number; glyph: string }
export const DEFAULT_AVATAR: Avatar = { hue: 45, glyph: '' };
export function cleanAvatar(raw: unknown): Avatar {
  const r = isObj(raw) ? raw : {};
  const hue = typeof r.hue === 'number' && Number.isFinite(r.hue) ? Math.min(359, Math.max(0, Math.round(r.hue))) : DEFAULT_AVATAR.hue;
  const glyph = (AVATAR_GLYPHS as readonly unknown[]).includes(r.glyph) ? (r.glyph as string) : '';
  return { hue, glyph };
}

export interface Profile {
  v: 1;
  name: string;
  shahi: number;
  gohar: number;
  trophies: number;
  xp: number;
  stats: Stats;
  owned: string[];
  equipped: Record<CosmeticKind, string>;
  settings: Settings;
  login: { last: string; streak: number };
  daily: { date: string; progress: Record<string, number>; claimed: string[] };
  ads: { day: string; watched: number; lastAt: number };
  reliefAt: number;
  achievements: string[];
  purchases: string[];
  tutorialDone: boolean;
  /** cleared solo stage ids (data/stages.ts) */
  stages: string[];
  /** honor id the player chose as title; null = best level honor */
  title: string | null;
  avatar: Avatar;
  tampered: number;
  /** latest time (ms) the profile saw a balance change; a clock earlier than this refuses day-keyed claims */
  lastSeen: number;
  ledger: LedgerEntry[];
}

export const START_SHAHI = 500;
export const AD_REWARD = 60;
export const AD_COOLDOWN_MS = 120_000;
export const AD_DAILY_CAP = 8;
export const RELIEF_BELOW = 20;
export const RELIEF_AMOUNT = 100;
export const RELIEF_EVERY_MS = 3 * 3600_000;
export const LEVEL_GOHAR = 2;
export const WIN_TROPHIES = 25;
export const LOSS_TROPHIES = 12;
export const POT_RAKE = 0.9; // 10% of every pot leaves the economy (sink)
export const LOGIN_SHAHI = [40, 60, 80, 100, 120, 150, 200];
export const LOGIN_GOHAR_DAY7 = 3;

export const DEFAULT_SETTINGS: Settings = {
  lang: 'fa', music: true, effects: true, notifications: false, hints: true, timeOfDay: 'auto',
  target: 'short', noSurInLastRound: true, mustCapture: true, openingJack: 'replace', surSarbazPoints: 10, turnTimer: 'off',
};

/** Load-time migration of saved settings: old `sound` becomes music + effects, old numeric targets map to short/long;
 *  only known keys are kept and bad values fall back to defaults. */
export function migrateSettings(raw: unknown): Settings {
  const r: Record<string, unknown> = isObj(raw) ? raw : {};
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in r) out[k] = r[k];
  if (typeof r.sound === 'boolean') {
    if (r.music === undefined) out.music = r.sound;
    if (r.effects === undefined) out.effects = r.sound;
  }
  // old builds stored 62 / 100 / 'single'
  if (r.target === 100) out.target = 'long';
  else if (r.target === 62 || r.target === 'single') out.target = 'short';
  for (const k of ['music', 'effects', 'notifications'] as const) {
    if (typeof out[k] !== 'boolean') out[k] = DEFAULT_SETTINGS[k];
  }
  const oneOf: Record<string, readonly unknown[]> = {
    lang: ['fa', 'en'], timeOfDay: ['auto', 'day', 'dusk', 'night'], target: ['short', 'long'], openingJack: ['replace', 'allow'],
    surSarbazPoints: [5, 10], turnTimer: ['off', 'normal', 'speed'],
  };
  for (const [k, ok] of Object.entries(oneOf)) if (!ok.includes(out[k])) out[k] = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[k];
  for (const k of ['hints', 'noSurInLastRound', 'mustCapture'] as const) if (typeof out[k] !== 'boolean') out[k] = DEFAULT_SETTINGS[k];
  return out as unknown as Settings;
}

const hashEntry = (e: Omit<LedgerEntry, 'h'>) => sha256([SECRET, e.prev, e.t, e.reason, e.dS, e.dG, e.s, e.g].join('|'));

export function applyDelta(p: Profile, dS: number, dG: number, reason: string, now: number): Profile {
  if (!Number.isInteger(dS) || !Number.isInteger(dG)) throw new Error('bad amount');
  if (p.shahi + dS < 0 || p.gohar + dG < 0) throw new Error('insufficient funds');
  const base = { t: now, reason, dS, dG, s: p.shahi + dS, g: p.gohar + dG, prev: p.ledger.at(-1)?.h ?? 'genesis' };
  return {
    ...p, shahi: base.s, gohar: base.g, lastSeen: Math.max(p.lastSeen ?? 0, now),
    ledger: [...p.ledger, { ...base, h: hashEntry(base) }].slice(-40),
  };
}

/** A clock set back by more than this (since the last saved activity) refuses day-keyed claims; covers NTP corrections. */
export const CLOCK_GRACE_MS = 5 * 60_000;
/** True when `now` is plausible: not earlier than the last recorded activity (minus grace). */
export const clockOk = (p: Profile, now: number) => now >= (p.lastSeen ?? 0) - CLOCK_GRACE_MS;

export function createProfile(now: number): Profile {
  const blank: Profile = {
    v: 1, name: '', shahi: 0, gohar: 0, trophies: 0, xp: 0,
    stats: { games: 0, wins: 0, losses: 0, draws: 0, surs: 0, sarbaz: 0, streak: 0, bestStreak: 0, byArena: {}, byPlayers: {} },
    owned: COSMETICS.filter((c) => c.gohar === 0).map((c) => c.id),
    equipped: { deck: 'deck-classic', back: 'back-indigo', table: 'table-arena' },
    settings: { ...DEFAULT_SETTINGS },
    login: { last: '', streak: 0 },
    daily: { date: '', progress: {}, claimed: [] },
    ads: { day: '', watched: 0, lastAt: 0 },
    reliefAt: 0, achievements: [], purchases: [], tutorialDone: false, stages: [], title: null, avatar: { ...DEFAULT_AVATAR }, tampered: 0, lastSeen: now, ledger: [],
  };
  return applyDelta(blank, START_SHAHI, 0, 'welcome', now);
}

const selfValid = (e: LedgerEntry) => { const { h, ...rest } = e; return hashEntry(rest) === h; };

/**
 * Detects edited balances or ledger; rolls back to the last chain-valid entry. Store purchases that sit after the
 * break are kept: a dropped `iap:` entry with its own valid hash, the pack's exact Gohar and a time not before the
 * valid head is granted again. An empty or wholly invalid ledger zeroes the balances only, never the rest of the profile.
 */
export function verifyProfile(p: Profile, now: number): Profile {
  let valid = 0;
  for (let i = 0; i < p.ledger.length; i++) {
    const e = p.ledger[i];
    if (!selfValid(e) || (i > 0 && e.prev !== p.ledger[i - 1].h)) break;
    valid = i + 1;
  }
  const head = p.ledger[valid - 1];
  if (valid === p.ledger.length && head && head.s === p.shahi && head.g === p.gohar) return p;
  // no valid entry: zero balances (not the welcome gift, or deleting the ledger would pay out) and keep everything else
  if (!head) return applyDelta({ ...p, shahi: 0, gohar: 0, ledger: [], tampered: p.tampered + 1 }, 0, 0, 'reset', now);
  let q: Profile = { ...p, shahi: head.s, gohar: head.g, ledger: p.ledger.slice(0, valid), tampered: p.tampered + 1 };
  const seen = new Set(q.ledger.map((e) => e.h)); // a copied entry is granted once
  // ponytail: an entry is not bound to this profile, so a fresh purchase entry could be pasted once into another save
  // idle since; bounded by real money spent. Store receipt checks are the real fix.
  for (const e of p.ledger.slice(valid)) {
    if (e.t < head.t) continue; // older than the valid head: could be replayed from the past, grant nothing
    const sku = e.reason.startsWith('iap:') ? e.reason.slice(4) : '';
    if (!sku || seen.has(e.h) || !selfValid(e) || !GOHAR_PACKS.some((x) => x.sku === sku && x.gohar === e.dG)) continue;
    seen.add(e.h);
    q = applyDelta(q, 0, e.dG, e.reason, now);
  }
  return q;
}

// XP values (see docs/xp-levels.md)
export const XP_FINISH = 20;
export const XP_WIN = 30;
export const XP_BIG_MARGIN = 20;
export const XP_SUR = 5;
export const XP_SARBAZ = 10;
export const XP_SUR_CAP = 50;
export const XP_QUIT = 40;
export const BIG_MARGIN_SHARE = 0.25;

export const bigMarginAt = (target: number): number => Math.ceil(target * BIG_MARGIN_SHARE);

/** Level L starts at 10·(L−1)·(L+8) XP; unbounded. */
export const xpForLevel = (lvl: number) => 10 * (lvl - 1) * (lvl + 8);
export function levelOf(xp: number): number {
  if (!Number.isFinite(xp) || xp < 100) return 1;
  let L = Math.floor((-9 + Math.sqrt(81 + 0.4 * xp)) / 2) + 1;
  while (xpForLevel(L + 1) <= xp) L++;
  while (L > 1 && xpForLevel(L) > xp) L--;
  return L;
}

/** A stage is open when it is the first or the one before it is cleared. */
export function stageUnlocked(p: Profile, id: string): boolean {
  const i = STAGES.findIndex((s) => s.id === id);
  return i === 0 || (i > 0 && p.stages.includes(STAGES[i - 1].id));
}

/** Marks a stage cleared and pays its prize, once. Locked, unknown or already-cleared stages change nothing. */
export function clearStage(p: Profile, id: string, now: number): Profile {
  const st = STAGES.find((s) => s.id === id);
  if (!st || !stageUnlocked(p, id) || p.stages.includes(id)) return p;
  return applyDelta({ ...p, stages: [...p.stages, id] }, st.prize, 0, `stage:${id}`, now);
}

export const canEnter = (p: Profile, a: Arena) => p.trophies >= a.minTrophies && p.shahi >= a.fee;
export const payFee = (p: Profile, a: Arena, now: number) => applyDelta(p, -a.fee, 0, `fee:${a.id}`, now);

export interface MatchSummary {
  arenaId: string; players: 2 | 3 | 4; outcome: 'win' | 'loss' | 'draw'; surs: number; sarbaz: number; paid: boolean; fee: number;
  /** Player's unit score minus best other unit's score; 0 when not a win. */
  margin: number; target: number; quit?: boolean;
}

export function matchXp(m: MatchSummary): number {
  if (m.quit) return -XP_QUIT;
  const win = m.outcome === 'win';
  return XP_FINISH + (win ? XP_WIN : 0) + (win && m.margin >= bigMarginAt(m.target) ? XP_BIG_MARGIN : 0)
    + Math.min(XP_SUR_CAP, XP_SUR * m.surs + XP_SARBAZ * m.sarbaz);
}

/** XP a forfeit would cost at this XP total: XP_QUIT, but never below the current level's start (same clamp as settleMatch). */
export const forfeitXpLoss = (xp: number) => xp - Math.max(xpForLevel(levelOf(xp)), xp - XP_QUIT);

export function settleMatch(p: Profile, m: MatchSummary, today: string, now: number) {
  const winners = m.players === 4 ? 2 : 1;
  const fee = Number.isFinite(m.fee) && m.fee > 0 ? Math.floor(m.fee) : 0;
  const payout = !m.paid ? 0 : m.outcome === 'win' ? Math.round((fee * m.players * POT_RAKE) / winners) : m.outcome === 'draw' ? fee : 0;
  let q = payout ? applyDelta(p, payout, 0, `${m.outcome}:${m.arenaId}`, now) : p;
  const trophyDelta = !m.paid ? 0 : m.outcome === 'win' ? WIN_TROPHIES : m.outcome === 'loss' ? -Math.min(LOSS_TROPHIES, q.trophies) || 0 : 0;
  const raw = matchXp(m);
  const newXp = raw >= 0 ? q.xp + raw : Math.max(xpForLevel(levelOf(q.xp)), q.xp + raw);
  const xpGain = newXp - q.xp;
  const before = levelOf(q.xp);
  const after = levelOf(newXp);
  const s = q.stats;
  const streak = m.outcome === 'win' ? s.streak + 1 : m.outcome === 'loss' ? 0 : s.streak;
  const ar = s.byArena[m.arenaId] ?? { games: 0, wins: 0 };
  const bp = s.byPlayers[m.players] ?? { games: 0, wins: 0, surs: 0 };
  q = {
    ...q,
    trophies: q.trophies + trophyDelta,
    xp: newXp,
    stats: {
      ...s, games: s.games + 1, wins: s.wins + (m.outcome === 'win' ? 1 : 0), losses: s.losses + (m.outcome === 'loss' ? 1 : 0),
      draws: s.draws + (m.outcome === 'draw' ? 1 : 0), surs: s.surs + m.surs, sarbaz: s.sarbaz + m.sarbaz,
      streak, bestStreak: Math.max(s.bestStreak, streak),
      byArena: { ...s.byArena, [m.arenaId]: { games: ar.games + 1, wins: ar.wins + (m.outcome === 'win' ? 1 : 0) } },
      byPlayers: m.quit ? s.byPlayers : { ...s.byPlayers, [m.players]: { games: bp.games + 1, wins: bp.wins + (m.outcome === 'win' ? 1 : 0), surs: bp.surs + m.surs } },
    },
  };
  const levelUps = after - before;
  if (levelUps > 0) q = applyDelta(q, 0, levelUps * LEVEL_GOHAR, 'level-up', now);
  q = recordEvents(q, today, { games: m.quit ? 0 : 1, wins: m.outcome === 'win' ? 1 : 0, surs: m.surs + m.sarbaz });
  return { profile: q, payout, trophyDelta, xpGain, levelUps };
}

// ---- daily login ----
export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterdayOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d - 1, 12));
};

export function loginPreview(p: Profile, today: string) {
  if (p.login.last === today) return { claimable: false, streak: p.login.streak };
  return { claimable: true, streak: p.login.last === yesterdayOf(today) ? p.login.streak + 1 : 1 };
}

export function claimLogin(p: Profile, today: string, now: number) {
  const { claimable, streak } = loginPreview(p, today);
  if (!claimable || today < p.login.last || !clockOk(p, now)) return { profile: p, shahi: 0, gohar: 0 };
  const day = (streak - 1) % 7;
  const shahi = LOGIN_SHAHI[day];
  const gohar = day === 6 ? LOGIN_GOHAR_DAY7 : 0;
  return { profile: { ...applyDelta(p, shahi, gohar, 'daily-login', now), login: { last: today, streak } }, shahi, gohar };
}

// ---- rewarded ads ----
export function adStatus(p: Profile, now: number, today: string) {
  const watched = p.ads.day === today ? p.ads.watched : 0;
  const wait = Math.max(0, p.ads.lastAt + AD_COOLDOWN_MS - now);
  const sane = clockOk(p, now) && today >= p.ads.day;
  return { ok: sane && watched < AD_DAILY_CAP && wait === 0, waitMs: wait, left: AD_DAILY_CAP - watched };
}

export function grantAd(p: Profile, today: string, now: number, amount = AD_REWARD): Profile {
  if (!adStatus(p, now, today).ok) throw new Error('ad not available');
  const watched = (p.ads.day === today ? p.ads.watched : 0) + 1;
  return { ...applyDelta(p, amount, 0, 'rewarded-ad', now), ads: { day: today, watched, lastAt: now } };
}

/** Bonus for an ad the player already watched (e.g. the result screen's double-up): never throws and does not use
 *  the daily cap or cooldown. A non-positive or fractional amount changes nothing. */
export const grantAdBonus = (p: Profile, amount: number, now: number): Profile =>
  Number.isInteger(amount) && amount > 0 ? applyDelta(p, amount, 0, 'ad-bonus', now) : p;

// ---- relief gift so nobody is locked out ----
// a future reliefAt (clock set back after a claim) is clamped to load time by the store loader, so it cannot lock relief forever
export const canClaimRelief = (p: Profile, now: number) => p.shahi < RELIEF_BELOW && now - p.reliefAt >= RELIEF_EVERY_MS;
export const claimRelief = (p: Profile, now: number): Profile =>
  canClaimRelief(p, now) ? { ...applyDelta(p, RELIEF_AMOUNT, 0, 'relief', now), reliefAt: now } : p;

// ---- challenges and achievements ----
export function honorValue(p: Profile, kind: HonorKind): number {
  const v = kind === 'level' ? levelOf(p.xp) : kind === 'wins' ? p.stats?.wins : p.stats?.surs;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}
export const honorUnlocked = (p: Profile, h: Honor): boolean => honorValue(p, h.kind) >= h.at;
export function currentTitle(p: Profile): Honor | null {
  const chosen = HONORS.find((h) => h.id === p.title);
  if (chosen && honorUnlocked(p, chosen)) return chosen;
  let best: Honor | null = null;
  for (const h of HONORS) if (h.kind === 'level' && honorUnlocked(p, h) && (!best || h.at > best.at)) best = h;
  return best;
}
export type ChallengeKind = 'games' | 'wins' | 'surs';
export interface Challenge { id: string; kind: ChallengeKind; goal: number; shahi: number }
const POOL: Record<ChallengeKind, Challenge[]> = {
  games: [{ id: 'games3', kind: 'games', goal: 3, shahi: 60 }, { id: 'games5', kind: 'games', goal: 5, shahi: 100 }],
  wins: [{ id: 'wins2', kind: 'wins', goal: 2, shahi: 80 }, { id: 'wins3', kind: 'wins', goal: 3, shahi: 140 }],
  surs: [{ id: 'surs1', kind: 'surs', goal: 1, shahi: 90 }, { id: 'surs2', kind: 'surs', goal: 2, shahi: 160 }],
};
export function dailyChallenges(today: string): Challenge[] {
  const seed = parseInt(sha256(today).slice(0, 6), 16);
  return (['games', 'wins', 'surs'] as ChallengeKind[]).map((k, i) => POOL[k][(seed >> i) % 2]);
}

// only rolls forward: a date earlier than the saved one (clock set back) keeps the saved day
const rollDay = (p: Profile, today: string): Profile =>
  p.daily.date >= today ? p : { ...p, daily: { date: today, progress: {}, claimed: [] } };

export function recordEvents(p: Profile, today: string, ev: Partial<Record<ChallengeKind, number>>): Profile {
  const q = rollDay(p, today);
  const progress = { ...q.daily.progress };
  for (const [k, n] of Object.entries(ev)) progress[k] = (progress[k] ?? 0) + (n ?? 0);
  return { ...q, daily: { ...q.daily, progress } };
}

export function claimChallenge(p: Profile, id: string, today: string, now: number): Profile {
  const q = rollDay(p, today);
  const c = dailyChallenges(today).find((x) => x.id === id);
  if (!c || q.daily.date !== today || !clockOk(p, now) || q.daily.claimed.includes(id) || (q.daily.progress[c.kind] ?? 0) < c.goal) return q;
  return { ...applyDelta(q, c.shahi, 0, `challenge:${id}`, now), daily: { ...q.daily, claimed: [...q.daily.claimed, id] } };
}

export interface Achievement { id: string; gohar: number; test: (p: Profile) => boolean }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-win', gohar: 3, test: (p) => p.stats.wins >= 1 },
  { id: 'wins-10', gohar: 5, test: (p) => p.stats.wins >= 10 },
  { id: 'first-sur', gohar: 2, test: (p) => p.stats.surs >= 1 },
  { id: 'sarbaz', gohar: 8, test: (p) => p.stats.sarbaz >= 1 },
  { id: 'streak-5', gohar: 6, test: (p) => p.stats.bestStreak >= 5 },
  { id: 'yazd', gohar: 5, test: (p) => p.trophies >= 450 },
  { id: 'golestan', gohar: 10, test: (p) => p.trophies >= 1400 },
];

export function checkAchievements(p: Profile, now: number) {
  let q = p;
  const unlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!q.achievements.includes(a.id) && a.test(q)) {
      q = { ...applyDelta(q, 0, a.gohar, `achv:${a.id}`, now), achievements: [...q.achievements, a.id] };
      unlocked.push(a.id);
    }
  }
  return { profile: q, unlocked };
}

// ---- shop ----
export function buyCosmetic(p: Profile, id: string, now: number): Profile {
  const c = COSMETICS.find((x) => x.id === id);
  if (!c || p.owned.includes(id)) return p;
  return { ...applyDelta(p, 0, -c.gohar, `buy:${id}`, now), owned: [...p.owned, id] };
}
export const equip = (p: Profile, id: string): Profile => {
  const c = COSMETICS.find((x) => x.id === id);
  return c && p.owned.includes(id) ? { ...p, equipped: { ...p.equipped, [c.kind]: id } } : p;
};

/** Idempotent: a restored or replayed purchase token is granted at most once. */
export function grantPurchase(p: Profile, sku: string, token: string, now: number): Profile {
  const pack = GOHAR_PACKS.find((x) => x.sku === sku);
  if (!pack || p.purchases.includes(token)) return p;
  return { ...applyDelta(p, 0, pack.gohar, `iap:${sku}`, now), purchases: [...p.purchases, token].slice(-200) };
}
