import { type Card, type Rng, isJack, isQueen, isKing, newDeck, shuffle } from './cards';

export interface RulesConfig {
  players: 2 | 3 | 4;
  /** match target: first unit to reach it (unique leader) wins; 'single' = one deal only */
  target: 62 | 100 | 'single';
  /** 'replace': a lone jack on the opening floor is replaced (Pagat/Wikipedia/Jahanshiri) */
  openingJack: 'replace' | 'allow';
  /** a card that can capture may not be dropped on the floor */
  mustCapture: boolean;
  noSurInLastRound: boolean;
  /** units with >= this many match points cannot score a sur; null = off */
  surCap: number | null;
  surSarbazPoints: number;
}

export const DEFAULT_RULES: RulesConfig = {
  players: 2,
  target: 62,
  openingJack: 'replace',
  mustCapture: true,
  noSurInLastRound: true,
  surCap: 50,
  surSarbazPoints: 10,
};

export interface DealState {
  config: RulesConfig;
  dealer: number;
  hands: Card[][];
  floor: Card[];
  stock: Card[];
  piles: Card[][];
  /** per seat */
  surs: number[];
  sarbaz: number[];
  turn: number;
  /** 0-based index of the 4-card round (نوبت) */
  round: number;
  lastCapturer: number | null;
  /** match points per unit at the start of this deal */
  carry: number[];
  over: boolean;
}

export interface Move {
  cardId: string;
  /** ids of floor cards captured; empty = drop on the floor */
  captureIds: string[];
}

export interface PlayResult {
  seat: number;
  card: Card;
  captured: Card[];
  sur: 'sur' | 'sarbaz' | null;
  newRound: boolean;
  dealOver: boolean;
  leftover: Card[];
}

export const unitOf = (players: number, seat: number) => (players === 4 ? seat % 2 : seat);
export const unitCount = (players: number) => (players === 4 ? 2 : players);
export const roundsPerDeal = (players: number) => 12 / players;

/** All valid capture sets for `card` against `floor` (each a non-empty list of floor cards). */
export function captureOptions(card: Card, floor: readonly Card[]): Card[][] {
  if (card.rank >= 12) return floor.filter((c) => c.rank === card.rank).map((c) => [c]);
  if (card.rank === 11) {
    const all = floor.filter((c) => c.rank <= 11);
    return all.length ? [all] : [];
  }
  const nums = floor.filter((c) => c.rank <= 10);
  const need = 11 - card.rank;
  const out: Card[][] = [];
  const rec = (from: number, sum: number, chosen: Card[]) => {
    if (sum === need) {
      out.push([...chosen]);
      return;
    }
    for (let i = from; i < nums.length; i++) {
      if (sum + nums[i].rank <= need) {
        chosen.push(nums[i]);
        rec(i + 1, sum + nums[i].rank, chosen);
        chosen.pop();
      }
    }
  };
  rec(0, 0, []);
  return out;
}

export function startDeal(config: RulesConfig, rng: Rng, dealer: number, carry: number[]): DealState {
  const n = config.players;
  for (;;) {
    const deck = shuffle(newDeck(), rng);
    const floor = deck.splice(0, 4);
    const hands = Array.from({ length: n }, () => deck.splice(0, 4));
    const stock = deck;
    if (config.openingJack === 'replace') {
      const j = floor.findIndex(isJack);
      if (j >= 0 && floor.filter(isJack).length === 1) {
        const [jack] = floor.splice(j, 1, stock.shift()!);
        stock.splice(Math.floor(rng() * (stock.length + 1)), 0, jack);
      }
      if (
        floor.filter(isJack).length > 0 ||
        floor.filter(isQueen).length > 2 ||
        floor.filter(isKing).length > 2
      ) {
        continue;
      }
    }
    return {
      config,
      dealer,
      hands,
      floor,
      stock,
      piles: Array.from({ length: n }, () => []),
      surs: new Array(n).fill(0),
      sarbaz: new Array(n).fill(0),
      turn: (dealer + 1) % n,
      round: 0,
      lastCapturer: null,
      carry,
      over: false,
    };
  }
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function legalMoves(s: DealState, seat = s.turn): Move[] {
  if (s.over) return [];
  const moves: Move[] = [];
  for (const card of s.hands[seat]) {
    const opts = captureOptions(card, s.floor);
    for (const o of opts) moves.push({ cardId: card.id, captureIds: o.map((c) => c.id) });
    if (opts.length === 0 || !s.config.mustCapture) moves.push({ cardId: card.id, captureIds: [] });
  }
  return moves;
}

export function play(s: DealState, cardId: string, captureIds: readonly string[] = []): { state: DealState; result: PlayResult } {
  if (s.over) throw new Error('deal is over');
  const seat = s.turn;
  const card = s.hands[seat].find((c) => c.id === cardId);
  if (!card) throw new Error(`card ${cardId} not in hand of seat ${seat}`);
  const opts = captureOptions(card, s.floor);
  const capturing = captureIds.length > 0;
  if (capturing && !opts.some((o) => sameSet(o.map((c) => c.id), captureIds))) throw new Error('invalid capture');
  if (!capturing && opts.length > 0 && s.config.mustCapture) throw new Error('capture is compulsory for this card');

  const n = s.config.players;
  const unit = unitOf(n, seat);
  const hands = s.hands.map((h) => [...h]);
  hands[seat] = hands[seat].filter((c) => c.id !== cardId);
  const piles = s.piles.map((p) => [...p]);
  const surs = [...s.surs];
  const sarbaz = [...s.sarbaz];
  let floor = [...s.floor];
  let stock = [...s.stock];
  let captured: Card[] = [];
  let lastCapturer = s.lastCapturer;
  let sur: PlayResult['sur'] = null;

  if (capturing) {
    captured = floor.filter((c) => captureIds.includes(c.id));
    const wasLoneJack = floor.length === 1 && isJack(floor[0]);
    floor = floor.filter((c) => !captureIds.includes(c.id));
    piles[seat].push(card, ...captured);
    lastCapturer = seat;
    if (floor.length === 0) {
      const lastRound = s.round === roundsPerDeal(n) - 1;
      const allowed =
        !(s.config.noSurInLastRound && lastRound) && !(s.config.surCap !== null && s.carry[unit] >= s.config.surCap);
      if (allowed) {
        if (isJack(card)) {
          if (wasLoneJack) {
            sur = 'sarbaz';
            sarbaz[seat]++;
          }
        } else {
          sur = 'sur';
          surs[seat]++;
        }
      }
    }
  } else {
    floor.push(card);
  }

  let round = s.round;
  let newRound = false;
  let over = false;
  let leftover: Card[] = [];
  if (hands.every((h) => h.length === 0)) {
    if (stock.length > 0) {
      for (let i = 0; i < n; i++) hands[i] = stock.splice(0, 4);
      round++;
      newRound = true;
    } else {
      over = true;
      if (lastCapturer !== null && floor.length) {
        leftover = floor;
        piles[lastCapturer].push(...floor);
        floor = [];
      }
    }
  }

  const state: DealState = {
    ...s,
    hands,
    floor,
    stock,
    piles,
    surs,
    sarbaz,
    turn: (seat + 1) % n,
    round,
    lastCapturer,
    over,
  };
  return { state, result: { seat, card, captured, sur, newRound, dealOver: over, leftover } };
}
