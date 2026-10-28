import { type Card, type Rng, newDeck } from './cards';
import { type DealState, type Move, captureOptions, legalMoves, play } from './deal';

export type Level = 'easy' | 'medium' | 'hard';

/** Rough worth of a card to whoever holds it at the end (used by all bot levels). */
export function cardWorth(c: Card): number {
  let v = 0.15;
  if (c.rank === 1 || c.rank === 11) v += 1.2;
  if (c.id === 'D10') v += 3.2;
  if (c.id === 'C2') v += 2.2;
  if (c.suit === 'C') v += 0.55;
  return v;
}

/** What `seat` would gain by this move, including a real sur if the engine grants one. */
function moveGain(s: DealState, m: Move): { gain: number; after: DealState } {
  const card = s.hands[s.turn].find((c) => c.id === m.cardId)!;
  const { state, result } = play(s, m.cardId, m.captureIds);
  let gain = 0;
  if (m.captureIds.length) {
    gain = cardWorth(card) + result.captured.reduce((a, c) => a + cardWorth(c), 0);
    if (result.sur === 'sur') gain += 5;
    if (result.sur === 'sarbaz') gain += s.config.surSarbazPoints;
  } else {
    gain = -cardWorth(card) * 0.9; // dropping a valuable card feeds the opponent
  }
  return { gain, after: state };
}

/** Hard bot: expected best reply of an opponent holding a random unseen card. */
function threat(s: DealState, after: DealState, seat: number): number {
  const seen = new Set<string>([
    ...after.floor.map((c) => c.id),
    ...after.hands[seat].map((c) => c.id),
    ...after.piles.flat().map((c) => c.id),
  ]);
  const unseen = newDeck().filter((c) => !seen.has(c.id));
  if (!unseen.length || !after.floor.length) return 0;
  let total = 0;
  for (const u of unseen) {
    let best = 0;
    for (const opt of captureOptions(u, after.floor)) {
      let g = cardWorth(u) + opt.reduce((a, c) => a + cardWorth(c), 0);
      if (opt.length === after.floor.length) {
        if (u.rank !== 11) g += 5;
        else if (after.floor.length === 1) g += s.config.surSarbazPoints;
      }
      best = Math.max(best, g);
    }
    total += best;
  }
  return (total / unseen.length) * 1.6; // opponent picks the best of ~4 cards
}

export function chooseMove(s: DealState, seat: number, level: Level, rng: Rng): Move {
  const moves = legalMoves(s, seat);
  if (!moves.length) throw new Error('no legal moves');
  if (level === 'easy' && rng() < 0.4) return moves[Math.floor(rng() * moves.length)];

  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const { gain, after } = moveGain(s, m);
    let score = gain + rng() * (level === 'easy' ? 1.5 : 0.2);
    if (level === 'hard' && !after.over) score -= threat(s, after, seat);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
