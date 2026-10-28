import type { Rng } from './cards';
import { type DealState, type PlayResult, type RulesConfig, play, startDeal, unitCount } from './deal';
import { type UnitScore, scoreDeal } from './score';

export interface MatchState {
  config: RulesConfig;
  /** match points per unit */
  scores: number[];
  deal: DealState;
  dealNo: number;
  phase: 'playing' | 'dealOver' | 'matchOver';
  /** unit index; null while undecided or on a drawn single deal */
  winner: number | null;
  history: UnitScore[][];
  lastResult: PlayResult | null;
}

export function newMatch(config: RulesConfig, rng: Rng, firstDealer?: number): MatchState {
  const n = config.players;
  const scores = new Array(unitCount(n)).fill(0);
  const dealer = firstDealer ?? Math.floor(rng() * n); // random starter (docx)
  return {
    config, scores, deal: startDeal(config, rng, dealer, scores), dealNo: 1,
    phase: 'playing', winner: null, history: [], lastResult: null,
  };
}

export function matchPlay(m: MatchState, cardId: string, captureIds: readonly string[] = []): MatchState {
  if (m.phase !== 'playing') throw new Error('deal is not in progress');
  const { state, result } = play(m.deal, cardId, captureIds);
  if (!state.over) return { ...m, deal: state, lastResult: result };

  const dealScores = scoreDeal(state);
  const scores = m.scores.map((p, i) => p + dealScores[i].total);
  const history = [...m.history, dealScores];
  const max = Math.max(...scores);
  const leaders = scores.flatMap((p, i) => (p === max ? [i] : []));
  const target = m.config.target;
  let phase: MatchState['phase'] = 'dealOver';
  let winner: number | null = null;
  if (target === 'single') {
    phase = 'matchOver';
    winner = leaders.length === 1 ? leaders[0] : null;
  } else if (max >= target && leaders.length === 1) {
    phase = 'matchOver';
    winner = leaders[0];
  }
  return { ...m, deal: state, scores, history, phase, winner, lastResult: result };
}

export function matchNextDeal(m: MatchState, rng: Rng): MatchState {
  if (m.phase !== 'dealOver') throw new Error('no finished deal to advance from');
  const dealer = (m.deal.dealer + 1) % m.config.players;
  return { ...m, deal: startDeal(m.config, rng, dealer, m.scores), dealNo: m.dealNo + 1, phase: 'playing', lastResult: null };
}
