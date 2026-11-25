import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chooseMove, matchNextDeal, matchPlay, mulberry32, type MatchState } from '@chaharbarg/engine';
import { ARENAS } from '../../data/arenas';

let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
  });
  vi.resetModules();
});

// fresh store + settle sharing one module graph
const load = async () => ({ store: await import('../../lib/store'), match: await import('../../lib/match'), settle: await import('./settle') });

function playOut(m: MatchState): MatchState {
  const rng = mulberry32(7);
  while (m.phase !== 'matchOver') {
    if (m.phase === 'dealOver') { m = matchNextDeal(m, rng); continue; }
    const mv = chooseMove(m.deal, m.deal.turn, 'easy', rng);
    m = matchPlay(m, mv.cardId, mv.captureIds);
  }
  return m;
}

async function finished(winner: number) {
  const x = await load();
  const ctx = x.match.buildCtx(x.store.getProfile(), ARENAS[0], 2, 'bots');
  const mc = { ...playOut(ctx.match), winner };
  x.store.saveMatch({ ...ctx, match: mc });
  return { ...x, ctx, mc };
}

describe('settleLocal', () => {
  it('a win pays the pot once, records it, and only then drops the save', async () => {
    const { store, settle, ctx, mc } = await finished(0);
    const shahi = store.getProfile().shahi;
    expect(store.loadMatch()).not.toBeNull();
    const guard = { current: false };
    const r = settle.settleLocal(guard, ctx, mc, 0);
    expect(r?.outcome).toBe('win');
    expect(r!.payout).toBeGreaterThan(0);
    expect(store.getProfile().shahi).toBeGreaterThanOrEqual(shahi + r!.payout);
    expect(store.getProfile().stats).toMatchObject({ games: 1, wins: 1 });
    expect(store.loadMatch()).toBeNull();
    // double tap: nothing more happens
    const after = store.getProfile();
    expect(settle.settleLocal(guard, ctx, mc, 0)).toBeNull();
    expect(store.getProfile()).toBe(after);
  });

  it('a loss pays nothing and counts one loss', async () => {
    const { store, settle, ctx, mc } = await finished(1);
    const shahi = store.getProfile().shahi;
    const r = settle.settleLocal({ current: false }, ctx, mc, 0);
    expect(r).toMatchObject({ outcome: 'loss', payout: 0 });
    expect(store.getProfile().shahi).toBe(shahi);
    expect(store.getProfile().stats).toMatchObject({ games: 1, losses: 1, wins: 0 });
  });
});

describe('forfeitSaved', () => {
  it('a paid match in progress is a quit loss, settled once', async () => {
    const { store, match, settle } = await load();
    const ctx = match.buildCtx(store.getProfile(), ARENAS[0], 2, 'bots');
    store.saveMatch(ctx);
    settle.forfeitSaved();
    expect(store.getProfile().stats).toMatchObject({ games: 1, losses: 1 });
    expect(store.loadMatch()).toBeNull();
    settle.forfeitSaved();
    expect(store.getProfile().stats.games).toBe(1);
  });

  it('a match that already ended settles with its real result, not a quit loss', async () => {
    const { store, settle } = await finished(0);
    settle.forfeitSaved();
    expect(store.getProfile().stats).toMatchObject({ games: 1, wins: 1, losses: 0 });
    expect(store.loadMatch()).toBeNull();
  });
});

describe('abandonSaved', () => {
  it('a paid match in progress is settled as a quit loss', async () => {
    const { store, match, settle } = await load();
    store.saveMatch(match.buildCtx(store.getProfile(), ARENAS[0], 2, 'bots'));
    settle.abandonSaved();
    expect(store.getProfile().stats).toMatchObject({ games: 1, losses: 1 });
    expect(store.loadMatch()).toBeNull();
  });

  it('a save that breaks settling is still dropped, with nothing recorded', async () => {
    const { store, match, settle } = await load();
    const ctx = match.buildCtx(store.getProfile(), ARENAS[0], 2, 'bots');
    store.saveMatch({ ...ctx, match: { ...ctx.match, history: [null as never] } });
    expect(store.loadMatch()).not.toBeNull();
    const stats = store.getProfile().stats;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    settle.abandonSaved();
    expect(store.loadMatch()).toBeNull();
    expect(store.getProfile().stats).toEqual(stats);
  });
});
