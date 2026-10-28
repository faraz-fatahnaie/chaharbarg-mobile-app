import { DEFAULT_RULES, parseCard, type Card, type DealState, type RulesConfig } from '../src/index';

export const cs = (s: string): Card[] => (s.trim() ? s.trim().split(/\s+/).map(parseCard) : []);

/** Build a deal state from explicit card strings, e.g. hands: ['C5 D6', 'S9 H2']. */
export function mk(o: {
  hands: string[];
  floor?: string;
  stock?: string;
  piles?: string[];
  turn?: number;
  round?: number;
  carry?: number[];
  config?: Partial<RulesConfig>;
}): DealState {
  const n = o.hands.length as 2 | 3 | 4;
  const config: RulesConfig = { ...DEFAULT_RULES, players: n, ...o.config };
  return {
    config,
    dealer: (n - 1),
    hands: o.hands.map(cs),
    floor: cs(o.floor ?? ''),
    stock: cs(o.stock ?? ''),
    piles: o.hands.map((_, i) => cs(o.piles?.[i] ?? '')),
    surs: o.hands.map(() => 0),
    sarbaz: o.hands.map(() => 0),
    turn: o.turn ?? 0,
    round: o.round ?? 0,
    lastCapturer: null,
    carry: o.carry ?? (n === 4 ? [0, 0] : o.hands.map(() => 0)),
    over: false,
  };
}

export const ids = (cards: Card[]) => cards.map((c) => c.id).sort();
