import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, legalMoves, mulberry32, newMatch } from '@chaharbarg/engine';
import { DEFAULT_SETTINGS, createProfile } from '../economy/economy';
import { fixMatchTarget, rulesFrom, stageCtx, timeoutMove } from './match';
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

describe('stageCtx', () => {
  it('is null for a locked or unknown stage', () => {
    expect(stageCtx(createProfile(0), 'stage-2')).toBeNull();
    expect(stageCtx(createProfile(0), 'nope')).toBeNull();
  });
  it('is a free 2-player match in the stage arena once open', () => {
    const c = stageCtx(createProfile(0), 'stage-1')!;
    expect(c).toMatchObject({ arenaId: 'persepolis', stageId: 'stage-1', mode: 'bots', paid: false, fee: 0 });
    expect(c.match.config.players).toBe(2);
    const p = { ...createProfile(0), stages: ['stage-1'] };
    expect(stageCtx(p, 'stage-2')!.arenaId).toBe('si-o-se-pol');
  });
});

describe('timeoutMove', () => {
  it('always returns a legal move; takes the biggest capture when one exists', () => {
    for (let seed = 1; seed < 40; seed++) {
      const deal = newMatch({ ...DEFAULT_RULES, players: 2, target: 35 }, mulberry32(seed)).deal;
      const mv = timeoutMove(deal, deal.turn, mulberry32(seed));
      const moves = legalMoves(deal, deal.turn);
      expect(moves.some((m) => m.cardId === mv.cardId && m.captureIds.join() === mv.captureIds.join())).toBe(true);
      const most = Math.max(...moves.map((m) => m.captureIds.length));
      if (most > 0) expect(mv.captureIds.length).toBe(most);
    }
  });
});
