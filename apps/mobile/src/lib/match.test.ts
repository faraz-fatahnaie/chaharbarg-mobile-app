import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, mulberry32, newMatch } from '@chaharbarg/engine';
import { DEFAULT_SETTINGS, createProfile } from '../economy/economy';
import { fixMatchTarget, rulesFrom } from './match';
import type { MatchCtx } from './store';

const profile = (target: 'short' | 'long') => ({ ...createProfile(0), settings: { ...DEFAULT_SETTINGS, target } });

const ctxWith = (players: 2 | 3 | 4, old: unknown): MatchCtx => {
  const match = newMatch({ ...DEFAULT_RULES, players, target: players === 4 ? 65 : 35 }, mulberry32(1));
  const target = old as 35;
  return {
    match: { ...match, config: { ...match.config, target }, deal: { ...match.deal, config: { ...match.deal.config, target } } },
    arenaId: 'a', seats: [], mode: 'pnp', paid: false, fee: 0, tod: 'day',
  };
};

describe('rulesFrom target', () => {
  it('short and long map per player count', () => {
    expect([2, 3, 4].map((n) => rulesFrom(profile('short'), n as 2 | 3 | 4).target)).toEqual([35, 35, 65]);
    expect([2, 3, 4].map((n) => rulesFrom(profile('long'), n as 2 | 3 | 4).target)).toEqual([65, 65, 112]);
  });
});

describe('fixMatchTarget', () => {
  it('returns a valid context unchanged', () => {
    const c = ctxWith(2, 35);
    expect(fixMatchTarget(c)).toBe(c);
  });
  it('maps old targets and rewrites both configs', () => {
    for (const [players, old, want] of [[2, 62, 65], [4, 100, 112], [3, 'single', 35]] as const) {
      const f = fixMatchTarget(ctxWith(players, old));
      expect(f.match.config.target).toBe(want);
      expect(f.match.deal.config.target).toBe(want);
    }
  });
});
