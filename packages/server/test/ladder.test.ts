import { afterEach, describe, expect, it } from 'vitest';
import { legalMoves, mulberry32 } from '@chaharbarg/engine';
import { createApp } from '../src/server';
import { guestLogin, openDb, trophiesOf, applyTrophies } from '../src/db';
import { Hub, Social } from '../src/social';
import { Queue, windowAt } from '../src/queue';
import { Rooms, RoomError } from '../src/rooms';

const fails = (f: () => unknown) => { try { f(); } catch (e) { return (e as RoomError).status; } return 0; };

function world(now = { t: 1_700_000_000_000 }) {
  const db = openDb(); const hub = new Hub();
  const finishes: any[] = [];
  const rooms = new Rooms({ rng: mulberry32(11), botDelayMs: 1, dealPauseMs: 5, idleLimitMs: 50, secondMs: 4, onFinish: (f) => { finishes.push(f); return f.ranked ? applyTrophies(db, f) : undefined; } });
  const queue = new Queue(db, hub, rooms, () => now.t, 0);
  const mk = (name: string, trophies = 0) => { const a = guestLogin(db, name); db.prepare('UPDATE players SET trophies = ? WHERE id = ?').run(trophies, a.id); hub.add(a.id, () => {}); return { id: a.id, name }; };
  return { db, hub, rooms, queue, mk, now, finishes };
}

describe('matchmaking queue', () => {
  it('pairs two waiting players, tells both, and makes a ranked room with timer 15', () => {
    const w = world();
    const a = w.mk('A', 100), b = w.mk('B', 130);
    const found: any[] = [];
    w.hub.add(a.id, (e) => found.push(e)); w.hub.add(b.id, (e) => found.push(e));
    w.queue.join(a, 2);
    expect(w.queue.size()).toBe(1);
    w.queue.join(b, 2);
    expect(w.queue.size()).toBe(0);
    expect(found.map((e) => e.type)).toEqual(['match-found', 'match-found']);
    const room = w.rooms.get(found[0].code);
    expect([room.ranked, room.status, room.timer, room.seats.length]).toEqual([true, 'playing', 15, 2]);
    w.rooms.close();
  });
  it('keeps far-apart players waiting until the window grows, and matches the closest', () => {
    const w = world();
    const a = w.mk('A', 0), far = w.mk('F', 600), near = w.mk('N', 100);
    w.queue.join(a, 2); w.queue.join(far, 2);
    expect(w.queue.size()).toBe(2);
    expect(windowAt(0)).toBe(150);
    w.now.t += 50_000; w.queue.tick(); // window 650: matches the oldest anchor with its closest
    expect(w.queue.size()).toBe(0);
    w.queue.join(near, 2);
    expect(w.queue.size()).toBe(1);
    w.rooms.close();
  });
  it('queues by room size, supports 4 players, cancel and offline removal', () => {
    const w = world();
    const ps = ['A', 'B', 'C', 'D'].map((n) => w.mk(n));
    ps.slice(0, 3).forEach((p) => w.queue.join(p, 4));
    expect(w.queue.size()).toBe(3);
    w.queue.leave(ps[2].id);
    expect(w.queue.size()).toBe(2);
    w.queue.join(ps[2], 4);
    w.queue.join(ps[3], 4);
    expect(w.queue.size()).toBe(0);
    const x = w.mk('X'); w.queue.join(x, 2);
    w.hub = undefined as never;
    expect(fails(() => w.queue.join({ id: 'ghost', name: 'g' }, 2))).toBe(409); // no live connection
    expect(fails(() => w.queue.join(x, 5))).toBe(400);
    w.rooms.close();
  });
});

describe('ladder trophies', () => {
  /** Humans play random legal moves until the match is over. */
  const play = (w: ReturnType<typeof world>, code: string) => {
    const r = w.rooms.get(code);
    return new Promise<void>((res) => {
      const t = setInterval(() => {
        if (r.status === 'over') { clearInterval(t); res(); return; }
        const m = r.match;
        const seat = m && m.phase === 'playing' ? r.seats[m.deal.turn] : null;
        if (!m || !seat?.playerId || seat.bot) return;
        const mv = legalMoves(m.deal, m.deal.turn)[0];
        try { w.rooms.move(code, seat.playerId, mv.cardId, mv.captureIds); } catch { /* raced with a timer */ }
      }, 2);
    });
  };
  it('ranked: winner +25, loser -12 but never below 0; friendly and bot rooms change nothing', async () => {
    const w = world();
    const a = w.mk('A', 40), b = w.mk('B', 5);
    w.queue.join(a, 2); w.queue.join(b, 2);
    const code = [...(w.rooms as any).rooms.keys()][0] as string;
    await play(w, code);
    const room = w.rooms.get(code);
    const winnerSeat = w.finishes[0].players.findIndex((p: any) => p.won);
    const ids = room.seats.map((s) => s.playerId!);
    const loser = ids[1 - winnerSeat];
    expect(trophiesOf(w.db, ids[winnerSeat])).toBe((winnerSeat === 0 ? 40 : 5) + 25);
    expect(trophiesOf(w.db, loser)).toBe(Math.max(0, (winnerSeat === 0 ? 5 : 40) - 12));
    expect(room.deltas!.filter((d) => d !== null).sort()).toEqual([-Math.min(12, winnerSeat === 0 ? 5 : 40), 25].sort());
    // friendly room with a bot: no trophy change
    const c = w.mk('C', 50);
    const fr = w.rooms.create(c.id, 'C', 2, 35, 5);
    w.rooms.start(fr.code, c.id, true);
    await play(w, fr.code);
    expect(trophiesOf(w.db, c.id)).toBe(50);
    expect(w.rooms.get(fr.code).deltas).toBeNull();
    w.rooms.close();
  }, 30000);
});

describe('rematch', () => {
  it('friendly rooms: starts again only when every human asks; ranked refuses; leaving frees the table', async () => {
    const w = world();
    const a = w.mk('A'), b = w.mk('B');
    const r = w.rooms.create(a.id, 'A', 2, 35, 5);
    w.rooms.join(r.code, b.id, 'B'); w.rooms.start(r.code, a.id, false);
    expect(fails(() => w.rooms.requestRematch(r.code, a.id))).toBe(409); // not over yet
    await new Promise<void>((res) => { const t = setInterval(() => { if (r.status === 'over') { clearInterval(t); res(); } }, 20); });
    w.rooms.requestRematch(r.code, a.id);
    expect(r.status).toBe('over');
    expect([...r.rematch]).toEqual([0]);
    w.rooms.requestRematch(r.code, b.id);
    expect(r.status).toBe('playing');
    expect(r.seats.every((s) => !s.bot && !s.abandoned)).toBe(true); // idle takeovers are reversed
    expect(r.rematch.size).toBe(0);
    expect(r.match!.scores).toEqual([0, 0]);
    // ranked refuses
    const q1 = w.mk('Q1'), q2 = w.mk('Q2'); w.queue.join(q1, 2); w.queue.join(q2, 2);
    const rankedCode = [...(w.rooms as any).rooms.keys()].find((c: string) => w.rooms.get(c).ranked)!;
    expect(fails(() => w.rooms.requestRematch(rankedCode, q1.id))).toBe(409);
    w.rooms.close();
  }, 30000);
  it('if the other player already left, a single request restarts with the remaining humans', async () => {
    const w = world();
    const a = w.mk('A'), b = w.mk('B');
    const r = w.rooms.create(a.id, 'A', 2, 35, 5);
    w.rooms.join(r.code, b.id, 'B'); w.rooms.start(r.code, a.id, false);
    await new Promise<void>((res) => { const t = setInterval(() => { if (r.status === 'over') { clearInterval(t); res(); } }, 20); });
    w.rooms.leave(r.code, b.id);
    w.rooms.requestRematch(r.code, a.id);
    expect(r.status).toBe('playing');
    w.rooms.close();
  }, 30000);
  it('a lobby: a joiner can leave; the host leaving closes the room', () => {
    const w = world();
    const a = w.mk('A'), b = w.mk('B');
    const r = w.rooms.create(a.id, 'A', 3, 35, 0);
    w.rooms.join(r.code, b.id, 'B');
    w.rooms.leave(r.code, b.id);
    expect(r.seats.length).toBe(1);
    w.rooms.leave(r.code, a.id);
    expect(fails(() => w.rooms.get(r.code))).toBe(404);
    w.rooms.close();
  });
});

describe('finding friends on the internet', () => {
  const social = () => { const db = openDb(); const hub = new Hub(); const s = new Social(db, hub); const mk = (n: string) => { const a = guestLogin(db, n); return { id: a.id, name: n }; }; return { s, hub, mk }; };
  it('search by name prefix needs 3 characters, hides self and blocked players', () => {
    const { s, mk } = social();
    const [me, ali, alina, bob] = ['Me', 'Alireza', 'Alina', 'Bob'].map(mk);
    expect(s.search(me, 'ali').map((p) => p.name)).toEqual(['Alina', 'Alireza']);
    expect(s.search(me, 'ALI')).toHaveLength(2); // case-insensitive for ASCII
    expect(fails(() => s.search(me, 'al'))).toBe(400);
    expect(s.search(me, '%%%')).toEqual([]); // wildcard characters are escaped
    s.block(me, ali.id);
    expect(s.search(me, 'ali').map((p) => p.name)).toEqual(['Alina']);
    expect(s.search(bob, 'ali').map((p) => p.name)).toEqual(['Alina', 'Alireza']);
  });
  it('a request can be made by id, and an invite reaches an online friend only', () => {
    const { s, hub, mk } = social();
    const [a, b, c] = ['A1x', 'B1x', 'C1x'].map(mk);
    s.request(a, b.id);
    s.accept(b, a.id);
    const got: any[] = [];
    hub.add(b.id, (e) => got.push(e));
    s.invite(a, b.id, { code: 'ABCDE', players: 2 });
    expect(got[0]).toMatchObject({ type: 'invite', code: 'ABCDE', from: { id: a.id } });
    expect(fails(() => s.invite(a, c.id, { code: 'ABCDE', players: 2 }))).toBe(403);
  });
});

let apps: ReturnType<typeof createApp>[] = [];
afterEach(() => { apps.forEach((x) => x.close()); apps = []; });
describe('queue over HTTP', () => {
  it('two clients queue through the API and are told the room code; ranked play updates the ladder', async () => {
    const app = createApp({ queueTickMs: 50, botDelayMs: 1, dealPauseMs: 5, rng: mulberry32(5) }); apps.push(app);
    await new Promise<void>((r) => app.server.listen(0, r));
    const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
    const login = async (name: string) => { const j = (await (await fetch(base + '/api/guest', { method: 'POST', body: JSON.stringify({ name }) })).json()) as { id: string; token: string }; return j; };
    const call = async (tok: string, method: string, path: string, body?: unknown) => { const r = await fetch(base + path, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { authorization: `Bearer ${tok}` } }); return { status: r.status, json: (await r.json()) as any }; };
    const a = await login('QA'), b = await login('QB');
    expect((await call(a.token, 'POST', '/api/queue', { players: 2 })).status).toBe(409); // no live connection yet
    const codes: Record<string, string> = {};
    const stops = [a, b].map((c) => {
      const ac = new AbortController();
      void fetch(base + '/api/me/events', { headers: { authorization: `Bearer ${c.token}` }, signal: ac.signal }).then(async (res) => {
        const reader = res.body!.getReader(); const dec = new TextDecoder();
        for (;;) { const { value, done } = await reader.read(); if (done) return; const m = /data: (.*)\n/.exec(dec.decode(value)); if (m) { const e = JSON.parse(m[1]); if (e.type === 'match-found') codes[c.id] = e.code; } }
      }).catch(() => {});
      return () => ac.abort();
    });
    await new Promise((r) => setTimeout(r, 100));
    expect((await call(a.token, 'POST', '/api/queue', { players: 2 })).status).toBe(200);
    expect((await call(b.token, 'POST', '/api/queue', { players: 2 })).status).toBe(200);
    await new Promise((r) => setTimeout(r, 300));
    expect(codes[a.id]).toBeTruthy();
    expect(codes[a.id]).toBe(codes[b.id]);
    expect((await call(a.token, 'GET', '/api/me')).json.queued).toBe(false);
    expect((await call(a.token, 'POST', `/api/rooms/${codes[a.id]}/rematch`, {})).status).toBe(409); // ranked
    expect((await call(a.token, 'GET', '/api/players/search?q=QB')).status).toBe(400);
    expect((await call(a.token, 'GET', '/api/players/search?q=QBx')).json.players).toEqual([]);
    expect((await call(a.token, 'GET', '/api/rankings?period=ladder')).json.rows).toEqual([]);
    stops.forEach((s) => s());
  });
});
