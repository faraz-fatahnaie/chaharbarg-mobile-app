import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/server';
import { RoomError } from '../src/rooms';
import { openDb, recordResult, guestLogin } from '../src/db';
import { Hub, Social, MAX_CHAT, REPORTS_TO_HIDE } from '../src/social';
import { claimPrize, ensurePrizes, periodStart, prizeInfo, rankings } from '../src/rankings';

const mkPlayers = (n: number) => {
  const db = openDb();
  const hub = new Hub();
  let t = 1_700_000_000_000;
  const social = new Social(db, hub, () => (t += 5000)); // every call is later than the rate limits
  const ps = Array.from({ length: n }, (_, i) => { const a = guestLogin(db, `P${i}`); return { id: a.id, name: a.name }; });
  return { db, hub, social, ps };
};
const code = (e: unknown) => (e as RoomError).status;
const fails = (f: () => unknown) => { try { f(); } catch (e) { return code(e); } return 0; };

describe('friends', () => {
  it('request, accept, list, remove', () => {
    const { social, ps: [a, b] } = mkPlayers(2);
    social.request(a, social.code(b.id));
    expect(social.list(b).incoming.map((x) => x.id)).toEqual([a.id]);
    expect(social.list(a).outgoing.map((x) => x.id)).toEqual([b.id]);
    social.accept(b, a.id);
    expect(social.list(a).friends.map((x) => x.id)).toEqual([b.id]);
    expect(social.list(b).friends.map((x) => x.id)).toEqual([a.id]);
    social.remove(a, b.id);
    expect(social.list(b).friends).toEqual([]);
  });
  it('reject drops a request; mutual requests become friends; bad codes and self are refused', () => {
    const { social, ps: [a, b, c] } = mkPlayers(3);
    social.request(a, social.code(b.id));
    social.reject(b, a.id);
    expect(social.list(b).incoming).toEqual([]);
    social.request(a, social.code(c.id));
    social.request(c, social.code(a.id));
    expect(social.areFriends(a.id, c.id)).toBe(true);
    expect(fails(() => social.request(a, 'NOPE22'))).toBe(404);
    expect(fails(() => social.request(a, social.code(a.id)))).toBe(400);
    expect(fails(() => social.request(a, social.code(c.id)))).toBe(409);
  });
  it('block removes the friendship and stops requests and messages both ways', () => {
    const { social, ps: [a, b] } = mkPlayers(2);
    social.request(a, social.code(b.id)); social.accept(b, a.id);
    social.block(a, b.id);
    expect(social.areFriends(a.id, b.id)).toBe(false);
    expect(fails(() => social.request(b, social.code(a.id)))).toBe(0); // looks sent: the block is not revealed
    expect(social.list(a).incoming).toEqual([]); // but nothing was stored or pushed
    expect(fails(() => social.request(a, social.code(b.id)))).toBe(403); // your own block: unblock first
    expect(fails(() => social.sendDm(b, a.id, 'hi'))).toBe(403);
    expect(social.list(a).blocked.map((x) => x.id)).toEqual([b.id]);
    social.unblock(a, b.id);
    expect(fails(() => social.request(b, social.code(a.id)))).toBe(0);
  });
  it('pushes requests to the other player and shows who is online', () => {
    const { social, hub, ps: [a, b] } = mkPlayers(2);
    const got: any[] = [];
    hub.add(b.id, (e) => got.push(e));
    social.request(a, social.code(b.id));
    expect(got[0]).toMatchObject({ type: 'friend-request', from: { id: a.id } });
    social.accept(b, a.id);
    expect(social.list(a).friends[0].online).toBe(true);
  });
});

describe('direct messages', () => {
  it('only friends, length-capped, delivered and stored', () => {
    const { social, hub, ps: [a, b, c] } = mkPlayers(3);
    social.request(a, social.code(b.id)); social.accept(b, a.id);
    const got: any[] = [];
    hub.add(b.id, (e) => got.push(e));
    social.sendDm(a, b.id, ' salam ');
    expect(got[0].msg.text).toBe('salam');
    expect(social.dmHistory(b, a.id).map((m: any) => m.text)).toEqual(['salam']);
    expect(fails(() => social.sendDm(a, c.id, 'hi'))).toBe(403);
    expect(fails(() => social.sendDm(a, b.id, ''))).toBe(400);
    expect(fails(() => social.sendDm(a, b.id, 'x'.repeat(501)))).toBe(400);
    expect(fails(() => social.dmHistory(a, c.id))).toBe(403);
  });
});

describe('public chat moderation', () => {
  it('filters words, caps length, rate-limits, and respects blocks', () => {
    const db = openDb(); const hub = new Hub(); let t = 1_700_000_000_000;
    const social = new Social(db, hub, () => t);
    const [a, b] = ['A', 'B'].map((n) => guestLogin(db, n));
    expect(social.postChat(a, 'you are a bitch').text).toBe('you are a ***');
    expect(fails(() => social.postChat(a, 'again'))).toBe(429);
    t += 2500;
    expect(fails(() => social.postChat(a, 'x'.repeat(MAX_CHAT + 1)))).toBe(400);
    expect(social.postChat(a, 'ok').text).toBe('ok');
    social.block(b, a.id);
    expect(social.chatHistory(b)).toEqual([]);
    expect(social.chatHistory(a)).toHaveLength(2);
  });
  it('enough reports hide the message and mute the sender', () => {
    const db = openDb(); const hub = new Hub(); let t = 1_700_000_000_000;
    const social = new Social(db, hub, () => t);
    const [spam, ...rs] = Array.from({ length: REPORTS_TO_HIDE + 1 }, (_, i) => guestLogin(db, `U${i}`));
    db.prepare('UPDATE players SET created = 0').run(); // old enough to report
    const msg = social.postChat(spam, 'buy now');
    expect(fails(() => social.report(spam, msg.id))).toBe(400);
    rs.slice(0, REPORTS_TO_HIDE).forEach((r) => social.report(r, msg.id));
    expect(social.chatHistory(rs[0])).toEqual([]);
    t += 5000;
    expect(fails(() => social.postChat(spam, 'again'))).toBe(403); // muted
    t += 11 * 60_000;
    expect(fails(() => social.postChat(spam, 'again'))).toBe(0);
  });
});

describe('rankings and prizes', () => {
  const SAT = Date.UTC(2026, 10, 14); // Saturday 2026-11-14
  const win = (db: ReturnType<typeof openDb>, ts: number, ids: [string, boolean, boolean?][], players = 2) => {
    const real = Date.now; Date.now = () => ts; // recordResult stamps with Date.now()
    try { recordResult(db, { config: { players, target: 35 } as any, winnerUnit: 0, ranked: true, players: ids.map(([id, won, ab]) => ({ playerId: id, name: id, won, abandoned: !!ab })) }, true); } finally { Date.now = real; }
  };
  it('weeks start on Saturday, months on the 1st', () => {
    expect(new Date(periodStart('week', Date.UTC(2026, 10, 18, 12))).toISOString()).toBe('2026-11-14T00:00:00.000Z');
    expect(new Date(periodStart('week', SAT)).toISOString()).toBe('2026-11-14T00:00:00.000Z');
    expect(new Date(periodStart('week', SAT - 1)).toISOString()).toBe('2026-11-07T00:00:00.000Z');
    expect(new Date(periodStart('month', Date.UTC(2026, 10, 30))).toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
  it('ranks by wins then coins from recorded results only, within the period; abandoned wins pay nothing', () => {
    const db = openDb();
    const [a, b, c] = ['A', 'B', 'C'].map((n) => guestLogin(db, n));
    win(db, SAT + 1000, [[a.id, true], [b.id, false]]);
    win(db, SAT + 2000, [[a.id, true], [c.id, false]]);
    win(db, SAT + 3000, [[b.id, true], [c.id, false]]);
    win(db, SAT - 1000, [[c.id, true], [a.id, false]]); // last week
    win(db, SAT + 4000, [[c.id, true, true], [a.id, false]]); // abandoned winner: counts as win row but 0 coins
    const rows = rankings(db, periodStart('week', SAT + 5000));
    expect(rows.map((r) => [r.name, r.wins])).toEqual([['A', 2], ['B', 1], ['C', 1]].map(([n, w]) => [(n === 'A' ? a : n === 'B' ? b : c).id, w]).map(([id, w]) => [id === a.id ? 'A' : id === b.id ? 'B' : 'C', w]));
    expect(rows[0].coins).toBe(100);
  });
  it('awards last week once, announces winners, and a prize can be claimed once by its owner', () => {
    const db = openDb();
    const [a, b] = ['A', 'B'].map((n) => guestLogin(db, n));
    win(db, SAT + 1000, [[a.id, true], [b.id, false]]);
    const later = SAT + 8 * 86_400_000; // the following week
    ensurePrizes(db, later); ensurePrizes(db, later);
    const info = prizeInfo(db, a.id, later) as unknown as { mine: { id: number; shahi: number }[]; announcement: { winners: { rank: number; name: string }[] }[] };
    expect(info.mine).toHaveLength(1);
    expect(info.mine[0].shahi).toBe(500);
    expect(info.announcement[0].winners[0]).toMatchObject({ rank: 1, name: 'A' });
    expect(claimPrize(db, b.id, info.mine[0].id)).toBeNull(); // not B's
    expect(claimPrize(db, a.id, info.mine[0].id)).toEqual({ shahi: 500, gohar: 0 });
    expect(claimPrize(db, a.id, info.mine[0].id)).toBeNull(); // only once
    expect((db.prepare('SELECT COUNT(*) n FROM prizes').get() as { n: number }).n).toBe(1);
  });
});

let apps: ReturnType<typeof createApp>[] = [];
afterEach(() => { apps.forEach((x) => x.close()); apps = []; });
describe('social over HTTP', () => {
  it('friend request, accept, message and rankings through the API', async () => {
    const app = createApp(); apps.push(app);
    await new Promise<void>((r) => app.server.listen(0, r));
    const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
    const call = async (tok: string, method: string, path: string, body?: unknown) => {
      const r = await fetch(base + path, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { authorization: `Bearer ${tok}` } });
      return { status: r.status, json: (await r.json()) as any };
    };
    const login = async (name: string) => (await (await fetch(base + '/api/guest', { method: 'POST', body: JSON.stringify({ name }) })).json()) as { id: string; token: string };
    const a = await login('A'); const b = await login('B');
    const meB = (await call(b.token, 'GET', '/api/me')).json;
    expect((await call(a.token, 'POST', '/api/friends/request', { code: meB.code })).status).toBe(200);
    expect((await call(b.token, 'POST', '/api/friends/accept', { id: a.id })).status).toBe(200);
    expect((await call(a.token, 'POST', `/api/dm/${b.id}`, { text: 'hello' })).status).toBe(200);
    expect((await call(b.token, 'GET', `/api/dm/${a.id}`)).json.messages[0].text).toBe('hello');
    expect((await call(a.token, 'POST', '/api/friends/accept', { id: 'not-a-uuid' })).status).toBe(400);
    expect((await call(a.token, 'GET', '/api/rankings?period=month')).json.rows).toEqual([]);
    expect((await call(a.token, 'POST', '/api/prizes/claim', { id: 999 })).status).toBe(404);
    expect((await call('bad', 'GET', '/api/friends')).status).toBe(401);
  });
});
