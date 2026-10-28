import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, chooseMove, matchNextDeal, matchPlay, mulberry32, newMatch, type Level } from '../src/index';

/** Win rate of `a` (seat 0 and 1 alternate) against `b` over `n` 62-point matches, 2 players. */
function duel(a: Level, b: Level, n: number, seed: number) {
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const rng = mulberry32(seed + i);
    const aSeat = i % 2; // alternate who is seated first
    let m = newMatch({ ...DEFAULT_RULES, players: 2 }, rng, i % 2);
    for (let guard = 0; guard < 10000 && m.phase !== 'matchOver'; guard++) {
      if (m.phase === 'dealOver') { m = matchNextDeal(m, rng); continue; }
      const seat = m.deal.turn;
      const mv = chooseMove(m.deal, seat, seat === aSeat ? a : b, rng);
      m = matchPlay(m, mv.cardId, mv.captureIds);
    }
    if (m.winner === aSeat) wins++;
  }
  return wins / n;
}

describe('bot levels are ordered (arena progression relies on it)', () => {
  it('medium beats easy, hard beats medium', () => {
    const mE = duel('medium', 'easy', 60, 1000);
    const hM = duel('hard', 'medium', 60, 5000);
    console.log(`medium vs easy: ${mE.toFixed(2)}, hard vs medium: ${hM.toFixed(2)}`);
    expect(mE).toBeGreaterThan(0.55);
    expect(hM).toBeGreaterThan(0.5);
  }, 120_000);
});
