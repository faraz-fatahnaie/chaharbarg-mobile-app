import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, chooseMove, matchNextDeal, matchPlay, mulberry32, newMatch, unitOf } from '@chaharbarg/engine';
import { createProfile, settleMatch, xpShare, type MatchSummary } from './economy';

const NOW = 1_700_000_000_000;

/** Plays `n` seeded all-medium-bot matches; returns mean deals, scaled and unscaled XP per match. */
function measure(players: 2 | 3 | 4, target: 62 | 100 | 'single', n: number) {
  let deals = 0;
  let xp = 0;
  let raw = 0;
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
      surs, sarbaz, paid: true, fee: 20, target,
    };
    const gain = settleMatch(createProfile(NOW), s, 'd', NOW).xpGain;
    deals += m.history.length;
    xp += gain;
    raw += Math.round(gain / xpShare(target)); // unscaled (exact up to rounding of the share)
  }
  return { deals: deals / n, xp: xp / n, raw: raw / n, perDeal: xp / deals, rawPerDeal: raw / deals };
}

describe('XP per deal by match target (F-051)', () => {
  for (const players of [2, 3, 4] as const) {
    it(`${players} players: single deals are no faster than a 62-point match`, () => {
      const one = measure(players, 'single', 200);
      const m62 = measure(players, 62, 40);
      const m100 = measure(players, 100, 40);
      const f = (r: ReturnType<typeof measure>) =>
        `deals ${r.deals.toFixed(2)}, xp/match ${r.xp.toFixed(1)} (unscaled ${r.raw.toFixed(1)}), xp/deal ${r.perDeal.toFixed(2)} (unscaled ${r.rawPerDeal.toFixed(2)})`;
      console.log(`${players}p single: ${f(one)}\n${players}p 62: ${f(m62)}\n${players}p 100: ${f(m100)}`);
      expect(one.rawPerDeal).toBeGreaterThan(m62.rawPerDeal); // the problem is real
      expect(one.perDeal).toBeLessThanOrEqual(m62.perDeal); // the fix works
    }, 60_000);
  }
});
