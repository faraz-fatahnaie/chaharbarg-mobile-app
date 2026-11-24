import { afterEach, describe, expect, it } from 'vitest';
import { legalMoves, mulberry32 } from '@chaharbarg/engine';
import { createApp } from '../src/server';
import type { RoomView } from '../src/rooms';

let apps: ReturnType<typeof createApp>[] = [];
afterEach(() => { apps.forEach((a) => a.close()); apps = []; });

async function boot(opts = {}) {
  const app = createApp({ dealPauseMs: 20, botDelayMs: 1, rng: mulberry32(7), ...opts });
  apps.push(app);
  await new Promise<void>((r) => app.server.listen(0, r));
  const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  return { app, base };
}

class Client {
  token = '';
  views: RoomView[] = [];
  last: RoomView | null = null;
  constructor(public base: string, public name: string) {}
  async api(method: string, path: string, body?: unknown, auth = true) {
    const res = await fetch(this.base + path, {
      method, body: body === undefined ? undefined : JSON.stringify(body),
      headers: { 'content-type': 'application/json', ...(auth && this.token ? { authorization: `Bearer ${this.token}` } : {}) },
    });
    return { status: res.status, json: (await res.json()) as Record<string, any> };
  }
  async login() { this.token = (await this.api('POST', '/api/guest', { name: this.name }, false)).json.token; return this; }
  /** Opens the event stream; `onView` runs for each view. */
  listen(code: string, onView: (v: RoomView) => void) {
    const ac = new AbortController();
    (async () => {
      const res = await fetch(`${this.base}/api/rooms/${code}/events`, { headers: { authorization: `Bearer ${this.token}` }, signal: ac.signal });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buf += dec.decode(value);
        let i: number;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          if (chunk.startsWith('data: ')) { const v = JSON.parse(chunk.slice(6)) as RoomView; this.views.push(v); this.last = v; onView(v); }
        }
      }
    })().catch(() => {});
    return () => ac.abort();
  }
}

/** Plays one full match with `humans` clients (the rest bots) and checks what each client may see. */
async function playMatch(players: 2 | 3 | 4, humans: number, target: number) {
  const { app, base } = await boot();
  const cs = await Promise.all(Array.from({ length: humans }, (_, i) => new Client(base, `P${i}`).login()));
  const { json } = await cs[0].api('POST', '/api/rooms', { players, target });
  const code = json.code as string;
  for (const c of cs.slice(1)) expect((await c.api('POST', `/api/rooms/${code}/join`, {})).status).toBe(200);

  const rng = mulberry32(3);
  const done = new Promise<void>((resolve) => {
    cs.forEach((c) => c.listen(code, (v) => {
      if (v.status === 'over') { resolve(); return; }
      const m = v.match;
      if (!m) return;
      if (m.phase === 'dealOver') { void c.api('POST', `/api/rooms/${code}/ready`, {}); return; }
      if (m.phase === 'playing' && m.deal.turn === v.mySeat) {
        const moves = legalMoves(m.deal, v.mySeat);
        const mv = moves[Math.floor(rng() * moves.length)];
        void c.api('POST', `/api/rooms/${code}/move`, { cardId: mv.cardId, captureIds: mv.captureIds });
      }
    }));
  });
  expect((await cs[0].api('POST', `/api/rooms/${code}/start`, { fillBots: humans < players })).status).toBe(200);
  await done;
  await new Promise((r) => setTimeout(r, 50));

  for (const c of cs) {
    expect(c.views.length).toBeGreaterThan(10);
    for (const v of c.views) {
      if (!v.match) continue;
      v.match.deal.hands.forEach((h, seat) => { if (seat !== v.mySeat) expect(h.every((card) => /^h\d+-\d+$/.test(card.id)), 'other hand hidden').toBe(true); });
      expect(v.match.deal.stock.every((card) => /^s\d+$/.test(card.id)), 'stock hidden').toBe(true);
    }
    expect(c.last!.status).toBe('over');
    expect(c.last!.match!.phase).toBe('matchOver');
  }
  const rows = app.db.prepare('SELECT COUNT(*) n FROM result_players').get() as { n: number };
  expect(rows.n).toBe(humans);
  const won = app.db.prepare('SELECT SUM(won) w FROM result_players').get() as { w: number };
  if (humans === players) expect(won.w).toBeGreaterThan(0); // with bots in the room the humans may lose
}

describe('online matches', () => {
  it('2 players: two humans play to the end', () => playMatch(2, 2, 35));
  it('3 players: three humans play to the end', () => playMatch(3, 3, 35));
  it('4 players: four humans play to the end', () => playMatch(4, 4, 65));
  it('1 human with bots filling the seats finishes too', () => playMatch(4, 1, 65));
});

describe('rejections', () => {
  it('rejects bad input, strangers, out-of-turn and illegal moves', async () => {
    const { base } = await boot({ botDelayMs: 60_000 });
    const a = await new Client(base, 'A').login();
    const b = await new Client(base, 'B').login();
    const c = await new Client(base, 'C').login();
    expect((await new Client(base, 'x').api('POST', '/api/rooms', { players: 2, target: 35 })).status).toBe(401);
    expect((await a.api('POST', '/api/guest', { name: '' }, false)).status).toBe(400);
    expect((await a.api('POST', '/api/rooms', { players: 5, target: 35 })).status).toBe(400);
    expect((await a.api('POST', '/api/rooms', { players: 2, target: 112 })).status).toBe(400);
    const code = (await a.api('POST', '/api/rooms', { players: 2, target: 35 })).json.code;
    expect((await b.api('POST', `/api/rooms/${code}/start`, {})).status).toBe(403); // not in room / not host
    expect((await a.api('POST', `/api/rooms/${code}/start`, {})).status).toBe(409); // waiting for players
    expect((await b.api('POST', `/api/rooms/${code}/join`, {})).status).toBe(200);
    expect((await c.api('POST', `/api/rooms/${code}/join`, {})).status).toBe(409); // full
    expect((await a.api('POST', '/api/rooms/ZZZZZ/join', {})).status).toBe(404);
    expect((await a.api('POST', `/api/rooms/${code}/move`, { cardId: 'S1' })).status).toBe(409); // not started
    let seats: RoomView | null = null;
    const offA = a.listen(code, (v) => { seats = v; });
    const offB = b.listen(code, () => {});
    expect((await a.api('POST', `/api/rooms/${code}/start`, {})).status).toBe(200);
    await new Promise((r) => setTimeout(r, 100));
    const v = seats as RoomView | null;
    expect(v?.match).toBeTruthy();
    const turn = v!.match!.deal.turn;
    const mover = turn === v!.mySeat ? a : b;
    const waiter = mover === a ? b : a;
    const hand = (mover === a ? a.last : b.last)!.match!.deal.hands[turn];
    expect((await waiter.api('POST', `/api/rooms/${code}/move`, { cardId: 'S1' })).status).toBe(409); // out of turn
    expect((await mover.api('POST', `/api/rooms/${code}/move`, { cardId: 'S99' })).status).toBe(400); // malformed
    expect((await mover.api('POST', `/api/rooms/${code}/move`, { cardId: hand[0].id, captureIds: ['H13', 'H13'] })).status).toBe(400); // illegal capture
    const big = await fetch(`${base}/api/guest`, { method: 'POST', body: JSON.stringify({ name: 'x'.repeat(10_000) }) });
    expect(big.status).toBe(413);
    offA(); offB();
  });
});
