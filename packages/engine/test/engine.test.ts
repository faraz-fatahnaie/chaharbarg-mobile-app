import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RULES, captureOptions, legalMoves, play, scoreDeal, startDeal, mulberry32,
  newMatch, matchPlay, matchNextDeal, chooseMove, unitOf, parseCard, type DealState, type Level,
} from '../src/index';
import { cs, ids, mk } from './helpers';

const opts = (card: string, floor: string) =>
  captureOptions(parseCard(card), cs(floor)).map(ids).map((a) => a.join(' ')).sort();

describe('capture options (R7-R9)', () => {
  it('T1 pairs and triples summing to 11', () => {
    expect(opts('C5', 'H6 D2 S4')).toEqual(['D2 S4', 'H6']); // 5+6 and 5+4+2
    expect(opts('C3', 'H6 D2 S4 S9')).toEqual(['D2 H6']); // 3 + 6 + 2
    expect(opts('C3', 'H5 D2 S1')).toEqual(['D2 H5 S1']); // 3 + 5 + 2 + 1
  });
  it('T2 ace counts 1', () => {
    expect(opts('C10', 'H1 D5')).toEqual(['H1']);
    expect(opts('C9', 'H1 D1')).toEqual(['D1 H1']); // 9 + 1 + 1
  });
  it('T3 queens and kings only pair', () => {
    expect(opts('C12', 'H12 D12 S13 D5')).toEqual(['D12', 'H12']);
    expect(opts('C13', 'H12 S13')).toEqual(['S13']);
  });
  it('T4 numerics never take Q/K', () => {
    expect(opts('C5', 'H12 S13')).toEqual([]);
  });
  it('T5 jack takes everything but Q/K, including jacks', () => {
    expect(opts('C11', 'H12 S13 D4 S11 C2')).toEqual(['C2 D4 S11']);
  });
  it('T6 jack with only Q/K takes nothing', () => {
    expect(opts('C11', 'H12 S13')).toEqual([]);
    expect(opts('C11', '')).toEqual([]);
  });
  it('T7 played card is part of the sum; T8 never an empty set', () => {
    expect(opts('C6', 'H5 D5')).toEqual(['D5', 'H5']);
    expect(opts('C6', 'H9')).toEqual([]);
  });
  it('T9 several valid sets are all listed', () => {
    // play 5: take 6, or 4+2 ... 5+4+2 = 11
    expect(opts('C5', 'H6 D4 S2')).toEqual(['D4 S2', 'H6']);
  });
});

describe('turn mechanics (R10-R13)', () => {
  it('T10 played card joins the pile on capture', () => {
    const s = mk({ hands: ['C5 H9', 'D3 D8'], floor: 'H6 S4', stock: '' });
    const { state } = play(s, 'C5', ['H6']);
    expect(ids(state.piles[0])).toEqual(['C5', 'H6']);
    expect(ids(state.floor)).toEqual(['S4']);
    expect(state.lastCapturer).toBe(0);
  });
  it('T11 no capture drops the card on the floor', () => {
    const s = mk({ hands: ['C5 H9', 'D3 D8'], floor: 'H1 S4' });
    const { state } = play(s, 'H9');
    expect(ids(state.floor)).toEqual(['H1', 'H9', 'S4']);
  });
  it('T12 mustCapture forbids dropping a capturing card', () => {
    const s = mk({ hands: ['C5 H9', 'D3 D8'], floor: 'H6 S4' });
    expect(() => play(s, 'C5')).toThrow();
    const lenient = mk({ hands: ['C5 H9', 'D3 D8'], floor: 'H6 S4', config: { mustCapture: false } });
    expect(() => play(lenient, 'C5')).not.toThrow();
  });
  it('T13 a non-capturing card can be dropped while a capturing one exists', () => {
    const s = mk({ hands: ['C5 H9', 'D3 D8'], floor: 'H6 S4' });
    const moves = legalMoves(s);
    expect(moves.some((m) => m.cardId === 'H9' && m.captureIds.length === 0)).toBe(true);
    expect(moves.some((m) => m.cardId === 'C5' && m.captureIds.length === 0)).toBe(false);
  });
  it('T14 turn order and 4p teams', () => {
    let s = mk({ hands: ['C9 C8', 'D9 D8', 'S9 S8', 'H9 H8'], floor: 'H1' });
    const seq: number[] = [];
    for (const id of ['C9', 'D9', 'S9', 'H9']) { seq.push(s.turn); s = play(s, id).state; }
    expect(seq).toEqual([0, 1, 2, 3]);
    expect([0, 1, 2, 3].map((x) => unitOf(4, x))).toEqual([0, 1, 0, 1]);
  });
  it('rejects illegal captures', () => {
    const s = mk({ hands: ['C5 H9', 'D3 D8'], floor: 'H6 S4' });
    expect(() => play(s, 'C5', ['S4'])).toThrow();
    expect(() => play(s, 'D3')).toThrow(); // not in hand
  });
});

describe('deal flow (R2, R5)', () => {
  for (const [n, rounds, stock] of [[2, 6, 40], [3, 4, 36], [4, 3, 32]] as const) {
    it(`T15 ${n}p: stock ${stock}, ${rounds} rounds, 52 cards conserved`, () => {
      const rng = mulberry32(7 + n);
      let s = startDeal({ ...DEFAULT_RULES, players: n }, rng, 0, new Array(n === 4 ? 2 : n).fill(0));
      expect(s.stock.length).toBe(stock);
      let plays = 0;
      const rounds0 = s.round;
      while (!s.over) {
        const total = s.stock.length + s.floor.length + s.hands.flat().length + s.piles.flat().length;
        expect(total).toBe(52);
        const m = chooseMove(s, s.turn, 'easy', rng);
        s = play(s, m.cardId, m.captureIds).state;
        plays++;
      }
      expect(plays).toBe(52 - 4);
      expect(rounds0).toBe(0);
      expect(s.round).toBe(rounds - 1);
      expect(s.piles.flat().length + s.floor.length).toBe(52);
    });
  }
  it('T17 opening floor never has a single jack (replace) nor >1 jack / >2 Q / >2 K', () => {
    for (let seed = 1; seed < 400; seed++) {
      const s = startDeal({ ...DEFAULT_RULES, players: 2 }, mulberry32(seed), 0, [0, 0]);
      const f = s.floor;
      expect(f.length).toBe(4);
      expect(f.filter((c) => c.rank === 11).length).toBe(0);
      expect(f.filter((c) => c.rank === 12).length).toBeLessThanOrEqual(2);
      expect(f.filter((c) => c.rank === 13).length).toBeLessThanOrEqual(2);
      expect(new Set([...f, ...s.stock, ...s.hands.flat()].map((c) => c.id)).size).toBe(52);
    }
  });
  it('T16 new round is dealt only when all hands are empty', () => {
    let s = mk({ hands: ['C9 C8', 'D9 D8'], floor: 'H1', stock: 'S2 S3 S4 S5 S6 S7 H2 H3' });
    s = play(s, 'C9').state; s = play(s, 'D9').state; s = play(s, 'C8').state;
    expect(s.round).toBe(0);
    s = play(s, 'D8').state;
    expect(s.round).toBe(1);
    expect(s.hands.map((h) => h.length)).toEqual([4, 4]);
  });
});

describe('sur (R15-R17)', () => {
  it('T19 clearing the floor is a sur', () => {
    const s = mk({ hands: ['C5 H9', 'D3 D8'], floor: 'H6', stock: 'S2 S3' });
    const { state, result } = play(s, 'C5', ['H6']);
    expect(result.sur).toBe('sur');
    expect(state.surs[0]).toBe(1);
  });
  it('T20 a jack clearing the floor is no sur', () => {
    const s = mk({ hands: ['C11 H9', 'D3 D8'], floor: 'H6 D2', stock: 'S2 S3' });
    const { state, result } = play(s, 'C11', ['H6', 'D2']);
    expect(result.sur).toBeNull();
    expect(state.surs[0]).toBe(0);
  });
  it('T21 no sur in the last round (toggle)', () => {
    const last = { hands: ['C5 H9', 'D3 D8'], floor: 'H6', round: 5 };
    expect(play(mk(last), 'C5', ['H6']).result.sur).toBeNull();
    expect(play(mk({ ...last, config: { noSurInLastRound: false } }), 'C5', ['H6']).result.sur).toBe('sur');
  });
  it('T22 units with >= surCap points cannot score a sur', () => {
    const base = { hands: ['C5 H9', 'D3 D8'], floor: 'H6', stock: 'S2' };
    expect(play(mk({ ...base, carry: [50, 0] }), 'C5', ['H6']).result.sur).toBeNull();
    expect(play(mk({ ...base, carry: [49, 0] }), 'C5', ['H6']).result.sur).toBe('sur');
    expect(play(mk({ ...base, carry: [80, 0], config: { surCap: null } }), 'C5', ['H6']).result.sur).toBe('sur');
  });
  it('T23 lone jack captured by the next player\'s jack is Sur Sarbaz (10)', () => {
    const s = mk({ hands: ['C9 H9', 'D11 D8'], floor: 'S11', stock: 'S2 S3', turn: 1 });
    const { state, result } = play(s, 'D11', ['S11']);
    expect(result.sur).toBe('sarbaz');
    expect(state.sarbaz[1]).toBe(1);
    expect(scoreDeal(state)[1].sarbaz).toBe(10);
  });
  it('T24 jack taking jack + other cards is not a sarbaz', () => {
    const s = mk({ hands: ['C9 H9', 'D11 D8'], floor: 'S11 D4', stock: 'S2 S3', turn: 1 });
    expect(play(s, 'D11', ['S11', 'D4']).result.sur).toBeNull();
  });
  it('Sarbaz points are configurable', () => {
    const s = mk({ hands: ['C9 H9', 'D11 D8'], floor: 'S11', stock: 'S2', turn: 1, config: { surSarbazPoints: 5 } });
    expect(scoreDeal(play(s, 'D11', ['S11']).state)[1].sarbaz).toBe(5);
  });
});

describe('end of deal and scoring (R18-R21)', () => {
  it('T25 last capturer takes the floor leftovers', () => {
    let s = mk({ hands: ['C5', 'D3'], floor: 'H6 S2', stock: '', round: 5 });
    s = play(s, 'C5', ['H6']).state; // capture; floor S2
    s = play(s, 'D3').state; // drop 3; floor S2 D3; deal over
    expect(s.over).toBe(true);
    expect(ids(s.piles[0])).toEqual(['C5', 'D3', 'H6', 'S2']);
    expect(s.floor.length).toBe(0);
  });
  it('T26 base points are always 20 over random games (2/3/4p)', () => {
    for (const n of [2, 3, 4] as const) {
      for (let seed = 1; seed <= 25; seed++) {
        const rng = mulberry32(seed * 31 + n);
        let s = startDeal({ ...DEFAULT_RULES, players: n }, rng, 0, new Array(n === 4 ? 2 : n).fill(0));
        while (!s.over) { const m = chooseMove(s, s.turn, (['easy', 'medium', 'hard'] as Level[])[seed % 3], rng); s = play(s, m.cardId, m.captureIds).state; }
        const sc = scoreDeal(s);
        const base = sc.reduce((a, u) => a + u.clubs + u.aces + u.jacks + u.tenD + u.twoC, 0);
        expect(base).toBe(20);
        expect(sc.length).toBe(n === 4 ? 2 : n);
      }
    }
  });
  it('T27 clubs: 7-6 split gives 7 to the unit with 7 (2p)', () => {
    const s = mk({ hands: ['', ''], piles: ['C1 C3 C4 C5 C6 C7 C8', 'C9 C10 C11 C12 C13 C2'] });
    expect(scoreDeal(s).map((u) => u.clubs)).toEqual([7, 0]);
  });
  it('T28 3p: tie for most clubs gives the 7 to the third', () => {
    const s = mk({ hands: ['', '', ''], piles: ['C1 C3 C4 C5 C6', 'C7 C8 C9 C10 C11', 'C12 C13 C2'] });
    expect(scoreDeal(s).map((u) => u.clubs)).toEqual([0, 0, 7]);
    const s2 = mk({ hands: ['', '', ''], piles: ['C1 C3 C4 C5 C6 C7', 'C8 C9 C10', 'C11 C12 C13 C2'] });
    expect(scoreDeal(s2).map((u) => u.clubs)).toEqual([7, 0, 0]);
  });
  it('T29 4p aggregates per team and counts points', () => {
    const s = mk({ hands: ['', '', '', ''], piles: ['C1 D10', 'C2 H1', 'S1 S11', 'H11 C13'] });
    const sc = scoreDeal(s);
    expect(sc.length).toBe(2);
    expect(sc[0]).toMatchObject({ aces: 2, jacks: 1, tenD: 3, twoC: 0 });
    expect(sc[1]).toMatchObject({ aces: 1, jacks: 1, twoC: 2 });
    expect(sc[0].total).toBe(2 + 1 + 3);
  });
  it('sur points are 5 each on top', () => {
    const s = mk({ hands: ['', ''] });
    s.surs = [2, 0];
    expect(scoreDeal(s)[0].sur).toBe(10);
    expect(scoreDeal(s)[0].total).toBe(10);
  });
});

describe('match (R21)', () => {
  const finish = (m: ReturnType<typeof newMatch>, rng: () => number) => {
    while (m.phase === 'playing') { const d = m.deal; const mv = chooseMove(d, d.turn, 'medium', rng); m = matchPlay(m, mv.cardId, mv.captureIds); }
    return m;
  };
  it('T30 plays deals until a unique leader reaches the target', () => {
    const rng = mulberry32(99);
    let m = newMatch({ ...DEFAULT_RULES, players: 2, target: 62 }, rng);
    let guard = 0;
    while (m.phase !== 'matchOver' && guard++ < 40) {
      m = finish(m, rng);
      if (m.phase === 'dealOver') m = matchNextDeal(m, rng);
    }
    expect(m.phase).toBe('matchOver');
    expect(Math.max(...m.scores)).toBeGreaterThanOrEqual(62);
    expect(m.winner).not.toBeNull();
    expect(m.history.length).toBeGreaterThan(1);
  });
  it('single-deal target ends after one deal', () => {
    const rng = mulberry32(5);
    let m = finish(newMatch({ ...DEFAULT_RULES, players: 3, target: 'single' }, rng), rng);
    expect(m.phase).toBe('matchOver');
    expect(m.history.length).toBe(1);
  });
});

describe('bots (T31-T32)', () => {
  it('only return legal moves, across levels and sizes', () => {
    for (const level of ['easy', 'medium', 'hard'] as Level[]) {
      for (const n of [2, 3, 4] as const) {
        const rng = mulberry32(1000 + n);
        let s: DealState = startDeal({ ...DEFAULT_RULES, players: n }, rng, 0, new Array(n === 4 ? 2 : n).fill(0));
        while (!s.over) {
          const m = chooseMove(s, s.turn, level, rng);
          const legal = legalMoves(s).some((l) => l.cardId === m.cardId && [...l.captureIds].sort().join() === [...m.captureIds].sort().join());
          expect(legal).toBe(true);
          s = play(s, m.cardId, m.captureIds).state;
        }
      }
    }
  });
});
