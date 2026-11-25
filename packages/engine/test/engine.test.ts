import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RULES, captureOptions, legalMoves, play, scoreDeal, liveScore, startDeal, mulberry32,
  newMatch, targetOptions, matchPlay, matchNextDeal, chooseMove, unitOf, parseCard, timeoutMove, shuffle, newDeck, type DealState, type MatchState, type Level, type RulesConfig,
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
  const base = { hands: ['C5 H9', 'D3 D8'], floor: 'H6', stock: 'S2' };
  it('T22 sur scores at any match score', () => {
    for (const c of [49, 50, 80, 200]) {
      const { state, result } = play(mk({ ...base, carry: [c, 0] }), 'C5', ['H6']);
      expect(result.sur).toBe('sur');
      expect(state.surs[0]).toBe(1);
    }
  });
  it('T22 sur scores at every target', () => {
    for (const [target, c] of [[35, 34], [65, 64], [112, 111]] as const) {
      const { state, result } = play(mk({ ...base, carry: [c, 0], config: { target } }), 'C5', ['H6']);
      expect(result.sur).toBe('sur');
      expect(scoreDeal(state)[0].sur).toBe(5);
    }
  });
  it('T22 4-player team above 50', () => {
    const s = mk({ hands: ['C5 H9', 'D3 D8', 'S9 S8', 'H2 H3'], floor: 'H6', stock: 'S2', carry: [60, 0] });
    const { state, result } = play(s, 'C5', ['H6']);
    expect(result.sur).toBe('sur');
    expect(scoreDeal(state)[0].sur).toBe(5);
  });
  it('Sur Sarbaz above 50', () => {
    const s = mk({ hands: ['C9 H9', 'D11 D8'], floor: 'S11', stock: 'S2 S3', turn: 1, carry: [0, 80] });
    const { state, result } = play(s, 'D11', ['S11']);
    expect(result.sur).toBe('sarbaz');
    expect(scoreDeal(state)[1].sarbaz).toBe(10);
  });
  it('legacy config with surCap is inert', () => {
    const config = { surCap: 50 } as unknown as Partial<RulesConfig>;
    expect(play(mk({ ...base, carry: [80, 0], config }), 'C5', ['H6']).result.sur).toBe('sur');
  });
  it('restrictions still hold at a high score', () => {
    const last = play(mk({ ...base, round: 5, carry: [80, 0] }), 'C5', ['H6']);
    expect(last.result.sur).toBeNull();
    expect(last.state.surs[0]).toBe(0);
    const jack = mk({ hands: ['C11 H9', 'D3 D8'], floor: 'H6 D2', stock: 'S2', carry: [80, 0] });
    expect(play(jack, 'C11', ['H6', 'D2']).result.sur).toBeNull();
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

describe('live score (F-004)', () => {
  const zero = { clubCount: 0, points: 0, surs: 0, total: 0 };
  it('is all zero before the first move (2/3/4p)', () => {
    for (const n of [2, 3, 4] as const) {
      const s = startDeal({ ...DEFAULT_RULES, players: n }, mulberry32(n), 0, new Array(n === 4 ? 2 : n).fill(0));
      const l = liveScore(s);
      expect(l.length).toBe(n === 4 ? 2 : n);
      l.forEach((u) => expect(u).toEqual(zero));
    }
  });
  it('counts a sur on the first turn', () => {
    const s = play(mk({ hands: ['C1 H9', 'D3 D8'], floor: 'D10', stock: 'S2 S3' }), 'C1', ['D10']).state;
    const l = liveScore(s);
    expect(l[0]).toEqual({ clubCount: 1, points: 4, surs: 1, total: 9 });
    expect(l[1]).toEqual(zero);
  });
  it('counts the clubs bonus once certain (2p)', () => {
    const s = mk({ hands: ['', ''], piles: ['C1 C3 C4 C5 C6 C7 C8', 'C9'] });
    expect(liveScore(s)[0]).toMatchObject({ clubCount: 7, points: 8 });
  });
  it('does not count the 3p clubs bonus mid-deal', () => {
    const s = mk({ hands: ['', '', ''], piles: ['C1 C3 C4 C5 C6 C7', 'C8 C9 C10', 'C11 C12 C13 C2'] });
    expect(liveScore(s)[0].points).toBe(1);
    s.over = true;
    expect(liveScore(s)[0].points).toBe(8);
    expect(liveScore(s)[0].total).toBe(scoreDeal(s)[0].total);
  });
  it('does not count a blocked last-round sur', () => {
    const s = play(mk({ hands: ['C5 H9', 'D3 D8'], floor: 'H6', round: 5 }), 'C5', ['H6']).state;
    const l = liveScore(s)[0];
    expect(l.surs).toBe(0);
    expect(l.total).toBe(l.points);
  });
  it('sums 4p team totals', () => {
    const s = mk({ hands: ['', '', '', ''], piles: ['C1 D10', 'C2 H1', 'S1 S11', 'H11 C13'] });
    s.surs = [1, 0, 1, 0];
    s.sarbaz = [0, 1, 0, 0];
    expect(s.config.surSarbazPoints).toBe(10);
    const l = liveScore(s);
    expect(l[0]).toEqual({ clubCount: 1, points: 6, surs: 2, total: 16 });
    expect(l[1]).toEqual({ clubCount: 2, points: 4, surs: 1, total: 14 });
  });
  it('matches scoreDeal at the end of random deals', () => {
    for (const n of [2, 3, 4] as const) {
      for (let seed = 1; seed <= 5; seed++) {
        const rng = mulberry32(seed * 17 + n);
        let s = startDeal({ ...DEFAULT_RULES, players: n }, rng, 0, new Array(n === 4 ? 2 : n).fill(0));
        while (!s.over) { const m = chooseMove(s, s.turn, 'medium', rng); s = play(s, m.cardId, m.captureIds).state; }
        const sc = scoreDeal(s);
        liveScore(s).forEach((u, i) => {
          expect(u.total).toBe(sc[i].total);
          expect(u.clubCount).toBe(sc[i].clubCount);
        });
      }
    }
  });
});

describe('match (R21)', () => {
  const finish = (m: ReturnType<typeof newMatch>, rng: () => number) => {
    while (m.phase === 'playing') { const d = m.deal; const mv = chooseMove(d, d.turn, 'medium', rng); m = matchPlay(m, mv.cardId, mv.captureIds); }
    return m;
  };
  it('T30 plays deals until a unique leader reaches the target', () => {
    const rng = mulberry32(99);
    let m = newMatch({ ...DEFAULT_RULES, players: 2, target: 65 }, rng);
    let guard = 0;
    while (m.phase !== 'matchOver' && guard++ < 40) {
      m = finish(m, rng);
      if (m.phase === 'dealOver') m = matchNextDeal(m, rng);
    }
    expect(m.phase).toBe('matchOver');
    expect(Math.max(...m.scores)).toBeGreaterThanOrEqual(65);
    expect(m.winner).not.toBeNull();
    expect(m.history.length).toBeGreaterThan(1);
  });
  it('targetOptions per player count', () => {
    expect(targetOptions(2)).toEqual([35, 65]);
    expect(targetOptions(3)).toEqual([35, 65]);
    expect(targetOptions(4)).toEqual([65, 112]);
  });
  it('ends at each valid target only with a unique leader at or above it', () => {
    for (const n of [2, 3, 4] as const) {
      for (const target of targetOptions(n)) {
        const rng = mulberry32(7 * n + target);
        let m = newMatch({ ...DEFAULT_RULES, players: n, target }, rng);
        for (let guard = 0; guard < 100 && m.phase !== 'matchOver'; guard++) {
          m = finish(m, rng);
          if (m.phase === 'dealOver') {
            const max = Math.max(...m.scores);
            expect(max < target || m.scores.filter((s) => s === max).length > 1).toBe(true);
            m = matchNextDeal(m, rng);
          }
        }
        expect(m.phase).toBe('matchOver');
        expect(m.winner).not.toBeNull();
        const w = m.scores[m.winner!];
        expect(w).toBeGreaterThanOrEqual(target);
        m.scores.forEach((s, i) => { if (i !== m.winner) expect(s).toBeLessThan(w); });
      }
    }
  });
  it('rejects a target not allowed for the player count', () => {
    expect(() => newMatch({ ...DEFAULT_RULES, players: 4, target: 35 }, mulberry32(1))).toThrow();
    expect(() => newMatch({ ...DEFAULT_RULES, players: 2, target: 112 }, mulberry32(1))).toThrow();
  });
  it('first player is random through the rng and deterministic per seed', () => {
    for (const n of [2, 3, 4] as const) {
      const seen = new Set<number>();
      for (let seed = 1; seed <= 100; seed++) {
        const cfg = { ...DEFAULT_RULES, players: n, target: targetOptions(n)[0] };
        const turn = newMatch(cfg, mulberry32(seed)).deal.turn;
        expect(turn).toBe((Math.floor(mulberry32(seed)() * n) + 1) % n);
        expect(newMatch(cfg, mulberry32(seed)).deal.turn).toBe(turn);
        seen.add(turn);
      }
      expect(seen.size).toBe(n);
    }
  });
  it('an injected first dealer is used and turns go up by one', () => {
    const m = newMatch({ ...DEFAULT_RULES, players: 4, target: 65 }, mulberry32(1), 2);
    expect(m.deal.dealer).toBe(2);
    expect(m.deal.turn).toBe(3);
  });
  it('later deals keep rotating the dealer', () => {
    const rng = mulberry32(3);
    let m = newMatch({ ...DEFAULT_RULES, players: 3, target: 65 }, rng);
    const prev = m.deal.dealer;
    m = finish(m, rng);
    expect(m.phase).toBe('dealOver');
    expect(matchNextDeal(m, rng).deal.dealer).toBe((prev + 1) % 3);
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

describe('review follow-ups', () => {
  const STOCK16 = 'S2 S3 S4 S5 S6 S7 S8 S10 H2 H3 H4 H5 H6 H7 H8 H10';
  const jacks = (cards: { rank: number }[]) => cards.filter((c) => c.rank === 11).length;
  /** The first shuffle startDeal makes for this seed (deck order before any fix-up). */
  const firstDeck = (seed: number) => shuffle(newDeck(), mulberry32(seed));
  const seeds = Array.from({ length: 2000 }, (_, i) => i + 1);

  it('opening floor: a single jack is replaced by the top stock card and reinserted into the stock', () => {
    const seed = seeds.find((sd) => {
      const d = firstDeck(sd);
      const floor = d.slice(0, 4);
      return jacks(floor) === 1 && d[12].rank < 11 && floor.filter((c) => c.rank >= 12).length <= 1;
    })!;
    expect(seed).toBeDefined();
    const d = firstDeck(seed);
    const j = d.slice(0, 4).findIndex((c) => c.rank === 11);
    const s = startDeal({ ...DEFAULT_RULES, players: 2 }, mulberry32(seed), 0, [0, 0]);
    const expected = d.slice(0, 4).map((c) => c.id);
    expected[j] = d[12].id;
    expect(s.floor.map((c) => c.id)).toEqual(expected);
    expect(s.stock.map((c) => c.id)).toContain(d[j].id);
    expect(s.stock.length).toBe(40);
    expect(s.hands.flat().map((c) => c.id)).toEqual(d.slice(4, 12).map((c) => c.id));
  });
  it('opening floor: two or more jacks force a re-deal; with openingJack "allow" the floor stands', () => {
    const seed = seeds.find((sd) => jacks(firstDeck(sd).slice(0, 4)) >= 2)!;
    expect(seed).toBeDefined();
    const first = firstDeck(seed).slice(0, 4).map((c) => c.id);
    const s = startDeal({ ...DEFAULT_RULES, players: 2 }, mulberry32(seed), 0, [0, 0]);
    expect(jacks(s.floor)).toBe(0);
    expect(s.floor.map((c) => c.id)).not.toEqual(first);
    const allow = startDeal({ ...DEFAULT_RULES, players: 2, openingJack: 'allow' }, mulberry32(seed), 0, [0, 0]);
    expect(allow.floor.map((c) => c.id)).toEqual(first);
  });

  it('timeoutMove takes the biggest capture, else a legal drop, and only for the seat on turn', () => {
    const s = mk({ hands: ['C5 S1', 'D2'], floor: 'S6 H4 H2', stock: 'S3' });
    const mv = timeoutMove(s, 0, mulberry32(1));
    expect(mv.cardId).toBe('C5');
    expect([...mv.captureIds].sort()).toEqual(['H2', 'H4']);
    const drop = mk({ hands: ['C12 S13', 'D2'], floor: 'H5', stock: 'S3' });
    const d = timeoutMove(drop, 0, mulberry32(1));
    expect(d.captureIds).toEqual([]);
    expect(legalMoves(drop).some((l) => l.cardId === d.cardId)).toBe(true);
    expect(() => timeoutMove(drop, 1, mulberry32(1))).toThrow(/not on turn/);
  });
  it('chooseMove throws when the seat is not on turn', () => {
    const s = mk({ hands: ['C5 S1', 'D2'], floor: 'S6' });
    expect(() => chooseMove(s, 1, 'hard', mulberry32(1))).toThrow(/not on turn/);
  });
  it('legalMoves rejects an out-of-range seat', () => {
    const s = mk({ hands: ['C5', 'D2'], floor: 'S6' });
    expect(() => legalMoves(s, 2)).toThrow();
    expect(() => legalMoves(s, -1)).toThrow();
    expect(legalMoves(s, 1).length).toBeGreaterThan(0);
  });

  it('parseCard rejects bad ids and accepts every deck id', () => {
    for (const bad of ['X99', 'X9', 'S0', 'S14', 'S01', 'S', '', 's5', 'C2 ', 'D1.5']) expect(() => parseCard(bad)).toThrow();
    for (const c of newDeck()) expect(parseCard(c.id)).toEqual(c);
  });

  it('newMatch range-checks players and firstDealer; the deal never aliases match scores', () => {
    expect(() => newMatch({ ...DEFAULT_RULES, players: 5 as 2, target: 35 }, mulberry32(1))).toThrow();
    expect(() => newMatch({ ...DEFAULT_RULES, players: 2, target: 35 }, mulberry32(1), 2)).toThrow();
    expect(() => newMatch({ ...DEFAULT_RULES, players: 2, target: 35 }, mulberry32(1), -1)).toThrow();
    expect(() => newMatch({ ...DEFAULT_RULES, players: 2, target: 35 }, mulberry32(1), 0.5)).toThrow();
    const m = newMatch({ ...DEFAULT_RULES, players: 2, target: 35 }, mulberry32(1), 1);
    expect(m.deal.carry).toEqual(m.scores);
    expect(m.deal.carry).not.toBe(m.scores);
  });

  const lastMoveMatch = (scores: number[], phase: MatchState['phase'] = 'playing'): MatchState => {
    // seat 0 drops the last card of the deal; seat 0's pile is worth 5 (4 aces + 1 jack)
    const deal = mk({ hands: ['S9', ''], piles: ['H1 S1 D1 C1 H11', ''], carry: scores });
    return { config: deal.config, scores, deal, dealNo: 1, phase, winner: null, history: [], lastResult: null };
  };
  it('a tie at or above the target does not end the match', () => {
    const m = matchPlay(lastMoveMatch([30, 35]), 'S9');
    expect(m.scores).toEqual([35, 35]);
    expect(m.phase).toBe('dealOver');
    expect(m.winner).toBeNull();
    const won = matchPlay(lastMoveMatch([31, 35]), 'S9');
    expect(won.phase).toBe('matchOver');
    expect(won.winner).toBe(0);
  });
  it('matchPlay / matchNextDeal throw in the wrong phase', () => {
    expect(() => matchPlay(lastMoveMatch([0, 0], 'dealOver'), 'S9')).toThrow();
    expect(() => matchPlay(lastMoveMatch([0, 0], 'matchOver'), 'S9')).toThrow();
    expect(() => matchNextDeal(lastMoveMatch([0, 0]), mulberry32(1))).toThrow();
    expect(() => matchNextDeal(lastMoveMatch([0, 0], 'matchOver'), mulberry32(1))).toThrow();
  });

  it('3p: a three-way clubs tie gives the 7 to nobody', () => {
    const s = mk({ hands: ['', '', ''], piles: ['C1 C3 C4 C5', 'C6 C7 C8 C9', 'C10 C11 C12 C13'] });
    expect(scoreDeal(s).map((u) => u.clubs)).toEqual([0, 0, 0]);
  });
  it('2p: nobody gets the clubs 7 without at least 7 clubs', () => {
    const tie = mk({ hands: ['', ''], piles: ['C1 C3 C4 C5 C6 C7', 'C8 C9 C10 C11 C12 C13'] });
    expect(scoreDeal(tie).map((u) => u.clubs)).toEqual([0, 0]);
    const short = mk({ hands: ['', ''], piles: ['C1 C3 C4 C5 C6 C7', 'C8 C9 C10 C11 C12'] });
    expect(scoreDeal(short).map((u) => u.clubs)).toEqual([0, 0]);
  });

  it('dropping on an empty floor puts the card there', () => {
    const { state, result } = play(mk({ hands: ['S9 S2', 'D8'], floor: '' }), 'S9');
    expect(state.floor.map((c) => c.id)).toEqual(['S9']);
    expect(result.captured).toEqual([]);
    expect(result.sur).toBeNull();
  });
  it('a deal with no captures leaves the floor unassigned', () => {
    let s = mk({ hands: ['S9', 'D9'], floor: 'H12' });
    s = play(s, 'S9').state;
    const { state, result } = play(s, 'D9');
    expect(state.over).toBe(true);
    expect(state.lastCapturer).toBeNull();
    expect(result.leftover).toEqual([]);
    expect(ids(state.floor)).toEqual(['D9', 'H12', 'S9']);
    expect(state.piles.flat()).toEqual([]);
  });

  for (const [n, last] of [[3, 3], [4, 2]] as const) {
    const hands = (lead: string) => [lead, 'D12 D9', 'S9 S8', 'H9 H8'].slice(0, n);
    it(`${n}p: no sur or sarbaz in the last round (round ${last}), both allowed before`, () => {
      expect(play(mk({ hands: hands('C5 H3'), floor: 'H6', round: last }), 'C5', ['H6']).result.sur).toBeNull();
      expect(play(mk({ hands: hands('C5 H3'), floor: 'H6', round: last - 1, stock: 'S2' }), 'C5', ['H6']).result.sur).toBe('sur');
      expect(play(mk({ hands: hands('C11 H3'), floor: 'S11', round: last }), 'C11', ['S11']).result.sur).toBeNull();
      expect(play(mk({ hands: hands('C11 H3'), floor: 'S11', round: last - 1, stock: 'S2' }), 'C11', ['S11']).result.sur).toBe('sarbaz');
      const off = mk({ hands: hands('C5 H3'), floor: 'H6', round: last, config: { noSurInLastRound: false } });
      expect(play(off, 'C5', ['H6']).result.sur).toBe('sur');
    });
    it(`${n}p: seat order continues across the new-round deal`, () => {
      const lead = ['C9', 'D9', 'S9', 'H9'].slice(0, n);
      let s = mk({ hands: lead, floor: 'H12', stock: STOCK16.split(' ').slice(0, 4 * n).join(' ') });
      const order: number[] = [];
      for (let i = 0; i < n; i++) {
        order.push(s.turn);
        s = play(s, s.hands[s.turn][0].id).state;
      }
      expect(order).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(s.round).toBe(1);
      expect(s.hands.map((h) => h.length)).toEqual(new Array(n).fill(4));
      expect(s.turn).toBe((s.dealer + 1) % n);
    });
  }
});
