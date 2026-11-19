import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, chooseMove, matchNextDeal, matchPlay, mulberry32, newMatch, targetOptions, unitOf } from '@chaharbarg/engine';
import { createProfile, settleMatch, type MatchSummary } from './economy';

const NOW = 1_700_000_000_000;

/** Plays `n` seeded all-medium-bot matches to the short (0) or long (1) target; returns mean deals and XP per match. */
function measure(players: 2 | 3 | 4, which: 0 | 1, n: number) {
  const target = targetOptions(players)[which];
  let deals = 0;
  let xp = 0;
  for (let i = 0; i < n; i++) {
    const rng = mulberry32(7000 + i * 31 + players);
    let m = newMatch({ ...DEFAULT_RULES, players, target }, rng, i % players);
    for (let guard = 0; guard < 20000 && m.phase !== 'matchOver'; guard++) {
      if (m.phase === 'dealOver') { m = matchNextDeal(m, rng); continue; }
      const seat = m.deal.turn;
      const mv = chooseMove(m.deal, seat, 'medium', rng);
      m = matchPlay(m, mv.cardId, mv.captureIds);
    }
    const hu = unitOf(players, 0);
    let surs = 0;
    let sarbaz = 0;
    for (const d of m.history) { surs += d[hu].sur / 5; sarbaz += d[hu].sarbaz / m.config.surSarbazPoints; }
    const s: MatchSummary = {
      arenaId: 'persepolis', players, outcome: m.winner === null ? 'draw' : m.winner === hu ? 'win' : 'loss',
      surs, sarbaz, paid: true, fee: 20, target, margin: 0,
    };
    deals += m.history.length;
    xp += settleMatch(createProfile(NOW), s, 'd', NOW).xpGain;
  }
  return { deals: deals / n, xp: xp / n };
}

describe('XP per match by match target', () => {
  for (const players of [2, 3, 4] as const) {
    it(`${players} players: a long match takes more deals and pays more XP than a short one`, () => {
      const short = measure(players, 0, 40);
      const long = measure(players, 1, 40);
      console.log(`${players}p short: ${JSON.stringify(short)}\n${players}p long: ${JSON.stringify(long)}`);
      expect(long.deals).toBeGreaterThan(short.deals);
      expect(long.xp).toBeGreaterThanOrEqual(short.xp);
    }, 60_000);
  }
});
