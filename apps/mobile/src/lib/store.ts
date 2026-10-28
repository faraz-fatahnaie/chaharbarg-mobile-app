import { useSyncExternalStore } from 'react';
import type { MatchState } from '@chaharbarg/engine';
import { DEFAULT_SETTINGS, createProfile, verifyProfile, type Profile } from '../economy/economy';

const KEY = 'chaharbarg.profile.v1';
const MATCH_KEY = 'chaharbarg.match.v1';

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Profile;
      return verifyProfile({ ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } }, Date.now());
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
}

export function saveMatch(c: MatchCtx | null) {
  try {
    if (c) localStorage.setItem(MATCH_KEY, JSON.stringify(c));
    else localStorage.removeItem(MATCH_KEY);
  } catch {
    /* ignore */
  }
}

export function loadMatch(): MatchCtx | null {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    return raw ? (JSON.parse(raw) as MatchCtx) : null;
  } catch {
    return null;
  }
}

export function resetAll() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(MATCH_KEY);
  } catch {
    /* ignore */
  }
  profile = createProfile(Date.now());
  persist();
  subs.forEach((s) => s());
}
