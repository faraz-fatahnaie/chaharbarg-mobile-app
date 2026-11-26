import { beforeAll, describe, expect, it, vi } from 'vitest';

type M = typeof import('./online');
let o: M;

beforeAll(async () => {
  vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost', search: '' });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  o = await import('./online');
});

const view = {
  code: 'ABCDE', status: 'playing', mySeat: 0, hostId: 'h', config: { players: 2, target: 35 }, timer: 15,
  seats: [{ name: 'a', bot: false, connected: true, abandoned: false }, { name: 'b', bot: true, connected: true, abandoned: false }],
  match: { config: { players: 2 } }, deadline: 123, ready: [0], ranked: false, rematch: [], deltas: [25, null], games: 1,
};

describe('server data guards', () => {
  it('parseView accepts a real view and rejects garbage', () => {
    expect(o.parseView(view)).toBe(view);
    expect(o.parseView({ ...view, match: null, deltas: null, deadline: null })).not.toBeNull();
    for (const bad of [null, 'x', [], {}, { ...view, status: 'hacked' }, { ...view, seats: [null] }, { ...view, config: { players: 9 } },
      { ...view, ready: ['0'] }, { ...view, deltas: [NaN] }, { ...view, match: 5 }, { ...view, timer: 7 }, { ...view, aborted: 'yes' }]) {
      expect(o.parseView(bad)).toBeNull();
    }
  });

  it('parseEvent accepts known events and rejects garbage', () => {
    const from = { id: 'u1', name: 'Ali' };
    const msg = { id: 1, ts: 2, from: 'u1', to: 'u2', text: 'hi' };
    for (const ok of [{ type: 'friend-request', from }, { type: 'dm', msg, fromName: 'Ali' }, { type: 'chat', msg: { ...msg, name: 'Ali' } },
      { type: 'chat-hide', id: 3 }, { type: 'match-found', code: 'ABCDE' }, { type: 'invite', code: 'ABCDE', players: 2, from }]) {
      expect(o.parseEvent(ok)).toBe(ok);
    }
    for (const bad of [null, 7, { type: 'nope' }, { type: 'invite', code: 'X', players: 2 }, { type: 'dm', msg: { id: 'x' }, fromName: 'a' },
      { type: 'match-found', code: 5 }, { type: 'friend-request', from: { id: 1, name: 'x' } }]) {
      expect(o.parseEvent(bad)).toBeNull();
    }
  });

  it('drainSse handles comments, CRLF, multi-line data and partial frames', () => {
    expect(o.drainSse(': hello\n\ndata: {"a":1}\n\ndata: {"b"')).toEqual({ data: ['{"a":1}'], rest: 'data: {"b"' });
    expect(o.drainSse('data: 1\r\n\r\ndata:2\r\rdata: [3,\ndata: 4]\n\n').data).toEqual(['1', '2', '[3,\n4]']);
    const a = o.drainSse('data: 5\r\n\r'); // the split falls inside \r\n
    expect(a.data).toEqual([]);
    expect(o.drainSse(a.rest + '\n').data).toEqual(['5']);
    expect(o.drainSse('event: x\nid: 3\n\n').data).toEqual([]);
  });
});

describe('watchRoom stops for good', () => {
  it('on a 404 and after an aborted view, but retries a 500', async () => {
    const calls: Record<string, number> = {};
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const code = /rooms\/(\w+)\//.exec(url)![1];
      calls[code] = (calls[code] ?? 0) + 1;
      if (code === 'GONE1') return new Response('{}', { status: 404 });
      if (code === 'ERR00') return new Response('{}', { status: 500 });
      return new Response(`: hi\n\ndata: ${JSON.stringify({ ...view, status: 'over', aborted: true })}\n\n`, { status: 200 });
    }));
    const views: unknown[] = [];
    const closed: string[] = [];
    const stops = ['GONE1', 'ABRT1', 'ERR00'].map((c) => o.watchRoom(c, (v) => views.push(v), () => {}, () => closed.push(c)));
    await new Promise((r) => setTimeout(r, 1200));
    stops.forEach((s) => s());
    expect(calls.GONE1).toBe(1);
    expect(calls.ABRT1).toBe(1);
    expect(calls.ERR00).toBeGreaterThan(1);
    expect(views).toHaveLength(1);
    expect(closed.sort()).toEqual(['ABRT1', 'GONE1']);
    vi.unstubAllGlobals();
  });
});

describe('server address', () => {
  it('https anywhere, with paths and IPv6; http only for local hosts unless dev', () => {
    const prod = (u: string) => o.validServerUrl(u, false);
    expect(prod('https://play.example.com/')).toBe('https://play.example.com');
    expect(prod('https://example.com:8443/pasur/api')).toBe('https://example.com:8443/pasur/api');
    expect(prod('https://[2001:db8::1]:8787')).toBe('https://[2001:db8::1]:8787');
    for (const ok of ['http://localhost:8787', 'http://192.168.1.20:8787', 'http://10.0.0.5', 'http://172.20.1.1', 'http://[::1]:8787', 'http://[fd00::1]', 'http://box.local']) {
      expect(prod(ok)).toBe(ok);
    }
    for (const bad of ['http://example.com', 'http://172.32.0.1', 'ftp://x.com', 'javascript:alert(1)', 'example.com', 'https://u:p@x.com', 'https://x.com/?a=1', 'https://x.com/#f', '']) {
      expect(prod(bad)).toBeNull();
    }
    expect(o.validServerUrl('http://example.com', true)).toBe('http://example.com');
  });
});

describe('expired or revoked token (F-100)', () => {
  it('a 401 signs in again once and retries; signOut revokes on the server', async () => {
    const seen: string[] = [];
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: { method: string; headers: Record<string, string> }) => {
      const path = new URL(url).pathname;
      seen.push(`${init.method} ${path} ${init.headers.authorization ?? '-'}`);
      if (path === '/api/guest') { n++; return Response.json({ id: 'i', token: `i.t${n}`, name: 'Sara' }); }
      if (path === '/api/me' && init.headers.authorization === 'Bearer i.t1') return Response.json({ error: 'sign in first' }, { status: 401 });
      return Response.json({ id: 'i', name: 'Sara', code: 'C', trophies: 0, queued: false });
    }));
    await o.signIn('Sara');
    expect((await o.getMe()).name).toBe('Sara');
    expect(seen.slice(1)).toEqual(['GET /api/me Bearer i.t1', 'POST /api/guest -', 'GET /api/me Bearer i.t2']);
    seen.length = 0;
    await o.signOut();
    expect(seen).toEqual(['POST /api/logout Bearer i.t2']);
    vi.unstubAllGlobals();
    vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost', search: '' });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  });
});
