import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { mulberry32 } from '@chaharbarg/engine';
import { finishMatch, guestLogin, openDb, PAIR_COOLDOWN_MS, pruneOld, RETENTION_MS, trophiesOf } from '../src/db';
import { ensurePrizes, rankings } from '../src/rankings';
import { FIRST_TURN_GRACE_S, ROOM_IDLE_MS, Rooms, type FinishInfo, type RoomView } from '../src/rooms';
import { filterText, Hub, MAX_REPORTS_PER_HOUR, REPORT_WINDOW_MS, REPORTS_TO_HIDE, Social } from '../src/social';
import { cleanName, createApp, MAX_OPEN_ROOMS, MAX_STREAMS, NEW_ACCOUNTS_PER_HOUR, WRITE_BURST } from '../src/server';

const T0 = Date.UTC(2026, 10, 14, 12); // a Saturday
const info = (ids: (string | null)[], ranked: boolean): FinishInfo => ({
  config: { players: ids.length, target: 35 } as FinishInfo['config'], winnerUnit: 0, ranked,
  players: ids.map((id, i) => ({ playerId: id, name: id ?? 'Bot', won: i === 0, abandoned: false })),
});
const status = (f: () => unknown) => { try { f(); } catch (e) { return (e as { status: number }).status; } return 0; };

describe('ranked-only results', () => {
  it('rankings count ranked all-human games only; bot-filled and friendly games never count', () => {
    const db = openDb();
    const [a, b] = ['A', 'B'].map((n) => guestLogin(db, n).id);
    expect(finishMatch(db, info([a, b], false), T0)).toBeUndefined(); // friendly
    expect(finishMatch(db, info([a, null], true), T0)).toEqual([0, null]); // ranked flag but a bot seat
    expect(rankings(db, T0 - 1)).toEqual([]);
    expect(trophiesOf(db, a)).toBe(0);
    expect(finishMatch(db, info([a, b], true), T0)).toEqual([25, 0]);
    expect(rankings(db, T0 - 1).map((r) => [r.id, r.wins])).toEqual([[a, 1]]);
  });
  it('repeat pairing within the cooldown changes nothing; after it, it counts again', () => {
    const db = openDb();
    const [a, b] = ['A', 'B'].map((n) => guestLogin(db, n).id);
    finishMatch(db, info([a, b], true), T0);
    expect(finishMatch(db, info([a, b], true), T0 + 60_000)).toEqual([0, 0]);
    expect(trophiesOf(db, a)).toBe(25);
    expect(rankings(db, T0 - 1)[0].wins).toBe(1);
    expect(finishMatch(db, info([a, b], true), T0 + PAIR_COOLDOWN_MS + 1)).toEqual([25, 0]);
    expect(trophiesOf(db, a)).toBe(50);
  });
  it('a failing write rolls the whole result back', () => {
    const db = openDb();
    const a = guestLogin(db, 'A').id;
    db.exec('CREATE TRIGGER boom BEFORE UPDATE OF trophies ON players BEGIN SELECT RAISE(ABORT, \'boom\'); END');
    expect(() => finishMatch(db, info([a, guestLogin(db, 'B').id], true), T0)).toThrow();
    expect((db.prepare('SELECT COUNT(*) n FROM results').get() as { n: number }).n).toBe(0);
  });
  it('an old database gains the ranked column, old results count as unranked', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'cb-')), 'old.db');
    const old = new DatabaseSync(path);
    old.exec('CREATE TABLE results (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, players INTEGER NOT NULL, target INTEGER NOT NULL); INSERT INTO results (ts, players, target) VALUES (1, 2, 35);');
    old.close();
    const db = openDb(path);
    expect(db.prepare('SELECT ranked FROM results').get()).toEqual({ ranked: 0 });
    db.close();
  });
  it('prizes are awarded for every missed finished week', () => {
    const db = openDb();
    const [a, b] = ['A', 'B'].map((n) => guestLogin(db, n).id);
    const WEEK = 7 * 86_400_000;
    finishMatch(db, info([a, b], true), T0);
    finishMatch(db, info([b, a], true), T0 + WEEK);
    ensurePrizes(db, T0 + 3 * WEEK);
    ensurePrizes(db, T0 + 3 * WEEK);
    const weekly = db.prepare("SELECT period, player_id FROM prizes WHERE period LIKE 'week:%' ORDER BY period").all() as { player_id: string }[];
    expect(weekly.map((p) => p.player_id)).toEqual([a, b]);
  });
  it('retention prunes old chat, messages and reports', () => {
    const db = openDb();
    db.prepare("INSERT INTO chat (ts, sender, name, text) VALUES (?, 'x', 'x', 'old'), (?, 'x', 'x', 'new')").run(T0 - RETENTION_MS - 1, T0);
    db.prepare("INSERT INTO dms (ts, sender, recipient, text) VALUES (?, 'x', 'y', 'old')").run(T0 - RETENTION_MS - 1);
    db.prepare("INSERT INTO chat_reports (msg_id, reporter, ts) VALUES (1, 'y', ?)").run(T0 - RETENTION_MS - 1);
    pruneOld(db, T0);
    expect(db.prepare('SELECT text FROM chat').all()).toEqual([{ text: 'new' }]);
    expect(db.prepare('SELECT COUNT(*) n FROM dms').get()).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) n FROM chat_reports').get()).toEqual({ n: 0 });
  });
});

describe('rooms: failures, janitor, shutdown, grace', () => {
  it('a DB failure inside onFinish does not crash, and the final state is still published', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rooms = new Rooms({ rng: mulberry32(5), idleLimitMs: 1, botDelayMs: 1, dealPauseMs: 1, onFinish: () => { throw new Error('db down'); } });
    const r = rooms.create('p1', 'P', 2, 35, 0);
    let last: RoomView | null = null;
    rooms.connect(r.code, 'p1', (v) => { last = v; });
    rooms.start(r.code, 'p1', true);
    await vi.waitFor(() => expect((last as RoomView | null)?.status).toBe('over'), { timeout: 20_000, interval: 20 });
    expect(last!.deltas).toBeNull();
    expect(err).toHaveBeenCalled();
    rooms.close(); err.mockRestore();
  }, 30_000);
  it('the janitor deletes idle rooms and deserted finished rooms, ending their streams', () => {
    const now = { t: T0 };
    const rooms = new Rooms({ now: () => now.t, rng: mulberry32(1) });
    const r = rooms.create('p1', 'P', 2, 35, 0);
    const end = vi.fn();
    rooms.connect(r.code, 'p1', () => {}, end);
    now.t += ROOM_IDLE_MS - 1; rooms.sweep();
    expect(rooms.size()).toBe(1);
    now.t += 2; rooms.sweep();
    expect(rooms.size()).toBe(0);
    expect(end).toHaveBeenCalledOnce();
    const o = rooms.create('p1', 'P', 2, 35, 0);
    o.status = 'over'; o.seats[0].left = true;
    rooms.sweep();
    expect(rooms.size()).toBe(0);
  });
  it('shutdown ends a match in progress as aborted, without a result, and closes the streams', () => {
    const onFinish = vi.fn();
    const rooms = new Rooms({ rng: mulberry32(1), onFinish });
    const r = rooms.create('p1', 'P', 2, 35, 0);
    rooms.join(r.code, 'p2', 'Q');
    rooms.start(r.code, 'p1', false);
    let last: RoomView | null = null; const end = vi.fn();
    rooms.connect(r.code, 'p2', (v) => { last = v; }, end);
    rooms.abortAll();
    expect([last!.status, last!.aborted, last!.deltas]).toEqual(['over', true, null]);
    expect(end).toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(rooms.size()).toBe(0);
  });
  it('the first turn of a ranked match has a grace period', () => {
    const rooms = new Rooms({ rng: mulberry32(1), now: () => T0, secondMs: 1000 });
    const r = rooms.create('p1', 'P', 2, 35, 15, true);
    rooms.join(r.code, 'p2', 'Q');
    rooms.start(r.code, 'p1', false);
    expect(r.deadline).toBe(T0 + (15 + FIRST_TURN_GRACE_S) * 1000);
    rooms.close();
  });
});

describe('chat guards', () => {
  it('bad words match whole words only', () => {
    expect(filterText('کسی کسب کنون')).toBe('کسی کسب کنون');
    expect(filterText('ای کس')).toBe('ای ***');
    expect(filterText('you BITCH!')).toBe('you ***!');
  });
  it('names lose bidi controls', () => {
    expect(cleanName('‮abc⁦d‏')).toBe('abcd');
    expect(() => cleanName('‮‬')).toThrow();
  });
  it('reports: new accounts are ignored, each account has a quota, old messages cannot be reported', () => {
    const db = openDb(); const hub = new Hub(); let t = T0;
    const social = new Social(db, hub, () => t);
    const spam = guestLogin(db, 'S');
    const young = Array.from({ length: REPORTS_TO_HIDE }, (_, i) => guestLogin(db, `Y${i}`));
    db.prepare('UPDATE players SET created = ?').run(T0); // all brand new
    const msg = social.postChat(spam, 'hello');
    young.forEach((y) => social.report(y, msg.id));
    expect(social.chatHistory(spam)).toHaveLength(1); // ignored: not hidden
    const old = guestLogin(db, 'Old');
    db.prepare('UPDATE players SET created = 0 WHERE id = ?').run(old.id);
    const ids = Array.from({ length: MAX_REPORTS_PER_HOUR + 1 }, () => { t += 3000; return social.postChat(spam, 'x').id; });
    ids.slice(0, MAX_REPORTS_PER_HOUR).forEach((id) => social.report(old, id));
    expect(status(() => social.report(old, ids[MAX_REPORTS_PER_HOUR]))).toBe(429);
    t += REPORT_WINDOW_MS + 1;
    expect(status(() => social.report(old, ids[MAX_REPORTS_PER_HOUR]))).toBe(404); // too old to have been seen
  });
});

let apps: ReturnType<typeof createApp>[] = [];
afterEach(() => { apps.forEach((a) => a.close()); apps = []; });
async function boot() {
  const app = createApp({ queueTickMs: 0 }); apps.push(app);
  await new Promise<void>((r) => app.server.listen(0, r));
  const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  const guest = (body: unknown) => fetch(base + '/api/guest', { method: 'POST', body: JSON.stringify(body) });
  const call = (tok: string, method: string, path: string, body?: unknown) =>
    fetch(base + path, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { authorization: `Bearer ${tok}` } });
  return { base, guest, call };
}

describe('shutdown over HTTP', () => {
  it('a client watching a match in progress receives the aborted view', async () => {
    const app = createApp({ queueTickMs: 0, rng: mulberry32(2) }); apps.push(app);
    await new Promise<void>((r) => app.server.listen(0, r));
    const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
    const login = async (name: string) => ((await (await fetch(base + '/api/guest', { method: 'POST', body: JSON.stringify({ name }) })).json()) as { token: string }).token;
    const [a, b] = [await login('A'), await login('B')];
    const post = (tok: string, path: string, body: unknown = {}) => fetch(base + path, { method: 'POST', body: JSON.stringify(body), headers: { authorization: `Bearer ${tok}` } });
    const code = ((await (await post(a, '/api/rooms', { players: 2, target: 35, timer: 15 })).json()) as { code: string }).code;
    await post(b, `/api/rooms/${code}/join`);
    await post(a, `/api/rooms/${code}/start`);
    let text = '';
    const res = await fetch(`${base}/api/rooms/${code}/events`, { headers: { authorization: `Bearer ${b}` } });
    const reader = res.body!.getReader(); const dec = new TextDecoder();
    const done = (async () => { for (;;) { const r = await reader.read().catch(() => ({ value: undefined, done: true as const })); if (r.done) return; text += dec.decode(r.value); } })();
    await new Promise((r) => setTimeout(r, 50));
    app.close();
    await done;
    expect(text).toContain('"aborted":true');
  });
});

describe('rate limits over HTTP', () => {
  it('caps new guest accounts per IP; signing back in still works', async () => {
    const { guest } = await boot();
    const first = (await (await guest({ name: 'G0' })).json()) as { id: string; token: string };
    for (let i = 1; i < NEW_ACCOUNTS_PER_HOUR; i++) expect((await guest({ name: `G${i}` })).status).toBe(200);
    expect((await guest({ name: 'one too many' })).status).toBe(429);
    expect((await guest({ name: 'G0', id: first.id, token: first.token.split('.')[1] })).status).toBe(200);
  });
  it('throttles write endpoints per account and caps open rooms', async () => {
    const { guest, call } = await boot();
    const { token } = (await (await guest({ name: 'W' })).json()) as { token: string };
    for (let i = 0; i < MAX_OPEN_ROOMS; i++) expect((await call(token, 'POST', '/api/rooms', { players: 2, target: 35 })).status).toBe(200);
    expect((await call(token, 'POST', '/api/rooms', { players: 2, target: 35 })).status).toBe(429);
    let last = 0;
    for (let i = 0; i < WRITE_BURST; i++) last = (await call(token, 'GET', '/api/players/search?q=abc')).status;
    expect(last).toBe(429);
    expect((await call(token, 'GET', '/api/me')).status).toBe(200); // reads are not throttled
  });
  it('caps event streams per player', async () => {
    const { guest, base } = await boot();
    const { token } = (await (await guest({ name: 'S' })).json()) as { token: string };
    const open = () => { const ac = new AbortController(); return { ac, res: fetch(base + '/api/me/events', { headers: { authorization: `Bearer ${token}` }, signal: ac.signal }) }; };
    const streams = Array.from({ length: MAX_STREAMS }, open);
    for (const s of streams) expect((await s.res).status).toBe(200);
    expect((await open().res).status).toBe(429);
    streams[0].ac.abort();
    await vi.waitFor(async () => { const s = open(); const st = (await s.res).status; s.ac.abort(); expect(st).toBe(200); }, { timeout: 2000, interval: 50 });
    streams.forEach((s) => s.ac.abort());
  });
});
