import { type Arena } from '../data/arenas';
import { COSMETICS, GOHAR_PACKS, type CosmeticKind } from '../data/cosmetics';
import { sha256 } from './sha256';

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
  sound: boolean;
  hints: boolean;
  timeOfDay: 'auto' | 'day' | 'dusk' | 'night';
  target: 62 | 100 | 'single';
  surCap: boolean;
  noSurInLastRound: boolean;
  mustCapture: boolean;
  openingJack: 'replace' | 'allow';
  surSarbazPoints: 5 | 10;
}

export interface Stats {
  games: number; wins: number; losses: number; draws: number;
  surs: number; sarbaz: number; streak: number; bestStreak: number;
  byArena: Record<string, { games: number; wins: number }>;
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
  tampered: number;
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
  lang: 'fa', sound: true, hints: true, timeOfDay: 'auto',
  target: 62, surCap: true, noSurInLastRound: true, mustCapture: true, openingJack: 'replace', surSarbazPoints: 10,
};

const hashEntry = (e: Omit<LedgerEntry, 'h'>) => sha256([SECRET, e.prev, e.t, e.reason, e.dS, e.dG, e.s, e.g].join('|'));

export function applyDelta(p: Profile, dS: number, dG: number, reason: string, now: number): Profile {
  if (p.shahi + dS < 0 || p.gohar + dG < 0) throw new Error('insufficient funds');
  const base = { t: now, reason, dS, dG, s: p.shahi + dS, g: p.gohar + dG, prev: p.ledger.at(-1)?.h ?? 'genesis' };
  return { ...p, shahi: base.s, gohar: base.g, ledger: [...p.ledger, { ...base, h: hashEntry(base) }].slice(-40) };
}

export function createProfile(now: number): Profile {
  const blank: Profile = {
    v: 1, name: '', shahi: 0, gohar: 0, trophies: 0, xp: 0,
    stats: { games: 0, wins: 0, losses: 0, draws: 0, surs: 0, sarbaz: 0, streak: 0, bestStreak: 0, byArena: {} },
    owned: COSMETICS.filter((c) => c.gohar === 0).map((c) => c.id),
    equipped: { deck: 'deck-classic', back: 'back-indigo', table: 'table-arena' },
    settings: { ...DEFAULT_SETTINGS },
    login: { last: '', streak: 0 },
    daily: { date: '', progress: {}, claimed: [] },
    ads: { day: '', watched: 0, lastAt: 0 },
    reliefAt: 0, achievements: [], purchases: [], tutorialDone: false, tampered: 0, ledger: [],
  };
  return applyDelta(blank, START_SHAHI, 0, 'welcome', now);
}

/** Detects edited balances or ledger; rolls back to the last chain-valid entry. */
export function verifyProfile(p: Profile, now: number): Profile {
  let valid = 0;
  for (let i = 0; i < p.ledger.length; i++) {
    const e = p.ledger[i];
    const { h, ...rest } = e;
    if (hashEntry(rest) !== h || (i > 0 && e.prev !== p.ledger[i - 1].h)) break;
    valid = i + 1;
  }
  const head = p.ledger[valid - 1];
  if (valid === p.ledger.length && head && head.s === p.shahi && head.g === p.gohar) return p;
  if (!head) return createProfile(now);
  return { ...p, shahi: head.s, gohar: head.g, ledger: p.ledger.slice(0, valid), tampered: p.tampered + 1 };
}

export const levelOf = (xp: number) => 1 + Math.floor(Math.sqrt(xp / 60));
export const xpForLevel = (lvl: number) => (lvl - 1) ** 2 * 60;

export const canEnter = (p: Profile, a: Arena) => p.trophies >= a.minTrophies && p.shahi >= a.fee;
export const payFee = (p: Profile, a: Arena, now: number) => applyDelta(p, -a.fee, 0, `fee:${a.id}`, now);

export interface MatchSummary {
  arenaId: string; players: 2 | 3 | 4; outcome: 'win' | 'loss' | 'draw'; surs: number; sarbaz: number; paid: boolean; fee: number;
}

export function settleMatch(p: Profile, m: MatchSummary, today: string, now: number) {
  const winners = m.players === 4 ? 2 : 1;
  const payout = !m.paid ? 0 : m.outcome === 'win' ? Math.round((m.fee * m.players * POT_RAKE) / winners) : m.outcome === 'draw' ? m.fee : 0;
  let q = payout ? applyDelta(p, payout, 0, `${m.outcome}:${m.arenaId}`, now) : p;
  const trophyDelta = !m.paid ? 0 : m.outcome === 'win' ? WIN_TROPHIES : m.outcome === 'loss' ? -Math.min(LOSS_TROPHIES, q.trophies) || 0 : 0;
  const xpGain = 20 + (m.outcome === 'win' ? 30 : 0) + 5 * (m.surs + m.sarbaz);
  const before = levelOf(q.xp);
  const after = levelOf(q.xp + xpGain);
  const s = q.stats;
  const streak = m.outcome === 'win' ? s.streak + 1 : m.outcome === 'loss' ? 0 : s.streak;
  const ar = s.byArena[m.arenaId] ?? { games: 0, wins: 0 };
  q = {
    ...q,
    trophies: q.trophies + trophyDelta,
    xp: q.xp + xpGain,
    stats: {
      ...s, games: s.games + 1, wins: s.wins + (m.outcome === 'win' ? 1 : 0), losses: s.losses + (m.outcome === 'loss' ? 1 : 0),
      draws: s.draws + (m.outcome === 'draw' ? 1 : 0), surs: s.surs + m.surs, sarbaz: s.sarbaz + m.sarbaz,
      streak, bestStreak: Math.max(s.bestStreak, streak),
      byArena: { ...s.byArena, [m.arenaId]: { games: ar.games + 1, wins: ar.wins + (m.outcome === 'win' ? 1 : 0) } },
    },
  };
  const levelUps = after - before;
  if (levelUps > 0) q = applyDelta(q, 0, levelUps * LEVEL_GOHAR, 'level-up', now);
  q = recordEvents(q, today, { games: 1, wins: m.outcome === 'win' ? 1 : 0, surs: m.surs + m.sarbaz });
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
  if (!claimable) return { profile: p, shahi: 0, gohar: 0 };
  const day = (streak - 1) % 7;
  const shahi = LOGIN_SHAHI[day];
  const gohar = day === 6 ? LOGIN_GOHAR_DAY7 : 0;
  return { profile: { ...applyDelta(p, shahi, gohar, 'daily-login', now), login: { last: today, streak } }, shahi, gohar };
}

// ---- rewarded ads ----
export function adStatus(p: Profile, now: number, today: string) {
  const watched = p.ads.day === today ? p.ads.watched : 0;
  const wait = Math.max(0, p.ads.lastAt + AD_COOLDOWN_MS - now);
  return { ok: watched < AD_DAILY_CAP && wait === 0, waitMs: wait, left: AD_DAILY_CAP - watched };
}

export function grantAd(p: Profile, today: string, now: number, amount = AD_REWARD): Profile {
  if (!adStatus(p, now, today).ok) throw new Error('ad not available');
  const watched = (p.ads.day === today ? p.ads.watched : 0) + 1;
  return { ...applyDelta(p, amount, 0, 'rewarded-ad', now), ads: { day: today, watched, lastAt: now } };
}

// ---- relief gift so nobody is locked out ----
export const canClaimRelief = (p: Profile, now: number) => p.shahi < RELIEF_BELOW && now - p.reliefAt >= RELIEF_EVERY_MS;
export const claimRelief = (p: Profile, now: number): Profile =>
  canClaimRelief(p, now) ? { ...applyDelta(p, RELIEF_AMOUNT, 0, 'relief', now), reliefAt: now } : p;

// ---- challenges and achievements ----
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

const rollDay = (p: Profile, today: string): Profile =>
  p.daily.date === today ? p : { ...p, daily: { date: today, progress: {}, claimed: [] } };

export function recordEvents(p: Profile, today: string, ev: Partial<Record<ChallengeKind, number>>): Profile {
  const q = rollDay(p, today);
  const progress = { ...q.daily.progress };
  for (const [k, n] of Object.entries(ev)) progress[k] = (progress[k] ?? 0) + (n ?? 0);
  return { ...q, daily: { ...q.daily, progress } };
}

export function claimChallenge(p: Profile, id: string, today: string, now: number): Profile {
  const q = rollDay(p, today);
  const c = dailyChallenges(today).find((x) => x.id === id);
  if (!c || q.daily.claimed.includes(id) || (q.daily.progress[c.kind] ?? 0) < c.goal) return q;
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
