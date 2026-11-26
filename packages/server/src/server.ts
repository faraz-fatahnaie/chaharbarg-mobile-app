import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import { authenticate, finishMatch, guestLogin, openDb, pruneOld, revokeToken, trophiesOf, type Db } from './db';
import { Queue } from './queue';
import { RoomError, Rooms, type RoomsOptions } from './rooms';
import { Hub, Social } from './social';
import { claimPrize, ladder, periodStart, prizeInfo, rankings, type Period } from './rankings';

const MAX_BODY = 4096;
const UUID = /^[0-9a-f-]{36}$/;
const CARD_ID = /^[SHDC](1[0-3]|[1-9])$/;
/** Control characters and bidi overrides/isolates/marks (they can reverse how other text around a name renders). */
export const cleanName = (x: unknown) => {
  const s = typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim() : '';
  if (!s || [...s].length > 24) throw new RoomError(400, 'name must be 1-24 characters');
  return s;
};

/** Abuse limits (in-memory, per process). */
export const GUEST_BURST = 20; // /api/guest calls and failed sign-ins per IP: burst, then 1 per second
export const NEW_ACCOUNTS_PER_HOUR = 10; // per IP
export const WRITE_BURST = 20; // rate-limited endpoints per account: burst, then 1 per second
export const MAX_OPEN_ROOMS = 3; // lobby or playing rooms one player may host
export const MAX_STREAMS = 6; // open event streams per player (room + personal)
const DAY_MS = 86_400_000;

/** Token bucket per key: `burst` calls at once, refilled at `perSec` per second. */
export function buckets(burst: number, perSec: number, now: () => number) {
  const m = new Map<string, { n: number; t: number }>();
  const level = (b: { n: number; t: number }, t: number) => Math.min(burst, b.n + ((t - b.t) / 1000) * perSec);
  return {
    take(key: string): boolean {
      const t = now();
      const b = m.get(key) ?? { n: burst, t };
      b.n = level(b, t); b.t = t;
      m.set(key, b);
      if (b.n < 1) return false;
      b.n -= 1;
      return true;
    },
    /** Forgets full buckets (they behave like new ones). */
    sweep() { const t = now(); for (const [k, b] of m) if (level(b, t) >= burst) m.delete(k); },
    size: () => m.size,
  };
}

/** Endpoints that write, search or award: throttled per account. Moves, ready and streams are not (the game drives them). */
const throttled = (method: string, path: string) =>
  (method === 'POST' && (path === '/api/rooms' || path === '/api/queue' || path.startsWith('/api/friends/') || path === '/api/chat/report'
    || path === '/api/prizes/claim' || /^\/api\/rooms\/[A-Z0-9]{5}\/(join|invite)$/.test(path)))
  || (method === 'GET' && (path === '/api/players/search' || path === '/api/prizes'));

/**
 * Key for per-IP limits. By default the socket address: X-Forwarded-For is client-controlled and forgeable.
 * With `trustProxy` (only when a proxy you run is the sole way in), the rightmost X-Forwarded-For entry, the
 * hop your proxy appended; anything left of it came from the client. Falls back to the socket address.
 */
export function clientIp(req: IncomingMessage, trustProxy = false): string {
  const sock = req.socket.remoteAddress ?? '?';
  if (!trustProxy) return sock;
  const last = String(req.headers['x-forwarded-for'] ?? '').split(',').pop()!.trim();
  return isIP(last) ? last : sock;
}

export interface ServerOptions extends RoomsOptions { db?: Db; queueTickMs?: number; trustProxy?: boolean }

export function createApp(opts: ServerOptions = {}) {
  const db = opts.db ?? openDb();
  const now = opts.now ?? Date.now;
  const rooms = new Rooms({
    ...opts,
    onFinish: (f) => { const d = finishMatch(db, f, now()); opts.onFinish?.(f); return d; },
  });

  const hub = new Hub();
  const social = new Social(db, hub, now);
  const queue = new Queue(db, hub, rooms, now, opts.queueTickMs);
  const perIp = buckets(GUEST_BURST, 1, now);
  const newAccounts = buckets(NEW_ACCOUNTS_PER_HOUR, NEW_ACCOUNTS_PER_HOUR / 3600, now);
  const perAccount = buckets(WRITE_BURST, 1, now);
  const streams = new Map<string, number>();

  // Janitor: idle rooms, stale throttle entries. Retention: old chat and messages, now and daily.
  const sweep = () => { try { rooms.sweep(); social.sweep(); perIp.sweep(); newAccounts.sweep(); perAccount.sweep(); } catch (e) { console.error('sweep failed', e); } };
  const prune = () => { try { pruneOld(db, now()); } catch (e) { console.error('prune failed', e); } };
  prune();
  const timers = [setInterval(sweep, 60_000), setInterval(prune, DAY_MS)];
  timers.forEach((t) => t.unref());

  /** Starts an event stream, at most MAX_STREAMS per player; false (and a 429) if over the cap. */
  const openStream = (res: ServerResponse, id: string) => {
    const n = streams.get(id) ?? 0;
    if (n >= MAX_STREAMS) { send(res, 429, { error: 'too many connections' }); return false; }
    streams.set(id, n + 1);
    res.on('close', () => { const k = (streams.get(id) ?? 1) - 1; if (k > 0) streams.set(id, k); else streams.delete(id); });
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    return true;
  };

  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const c of req) {
      size += (c as Buffer).length;
      if (size > MAX_BODY) throw new RoomError(413, 'body too large');
      chunks.push(c as Buffer);
    }
    if (!size) return {};
    try {
      const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw 0;
      return v as Record<string, unknown>;
    } catch {
      throw new RoomError(400, 'invalid JSON');
    }
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const method = req.method ?? 'GET';
    const ip = clientIp(req, opts.trustProxy);

    if (method === 'POST' && path === '/api/guest') {
      if (!perIp.take(ip)) return send(res, 429, { error: 'slow down' });
      const b = await readJson(req);
      const a = guestLogin(db, cleanName(b.name), typeof b.id === 'string' ? b.id : undefined, typeof b.token === 'string' ? b.token : undefined, () => newAccounts.take(ip), now());
      return send(res, 200, { id: a.id, token: `${a.id}.${a.token}`, name: a.name });
    }

    const me = authenticate(db, req.headers.authorization, now());
    if (!me) return send(res, perIp.take(ip) ? 401 : 429, { error: 'sign in first' });
    if (method === 'POST' && path === '/api/logout') { revokeToken(db, me.id); return send(res, 200, {}); }
    if (throttled(method, path) && !perAccount.take(me.id)) return send(res, 429, { error: 'slow down' });

    if (method === 'POST' && path === '/api/rooms') {
      if (rooms.openRoomsOf(me.id) >= MAX_OPEN_ROOMS) throw new RoomError(429, 'you already have open rooms');
      const b = await readJson(req);
      const r = rooms.create(me.id, me.name, Number(b.players), Number(b.target), Number(b.timer ?? 0));
      return send(res, 200, { code: r.code });
    }

    // ---- account, friends, direct messages, public chat, rankings, prizes ----
    if (path === '/api/me' && method === 'GET') return send(res, 200, { id: me.id, name: me.name, code: social.code(me.id), trophies: trophiesOf(db, me.id), queued: queue.has(me.id) });
    if (path === '/api/me/events' && method === 'GET') {
      if (!openStream(res, me.id)) return;
      res.write(': hello\n\n');
      const off = hub.add(me.id, (e) => res.write(`data: ${JSON.stringify(e)}\n\n`));
      const ping = setInterval(() => res.write(': ping\n\n'), 20_000);
      res.on('close', () => { clearInterval(ping); off(); if (!hub.online(me.id)) queue.leave(me.id); });
      return;
    }
    if (path === '/api/queue' && method === 'POST') { queue.join(me, Number((await readJson(req)).players)); return send(res, 200, { ok: true }); }
    if (path === '/api/queue/leave' && method === 'POST') { queue.leave(me.id); return send(res, 200, { ok: true }); }
    if (path === '/api/players/search' && method === 'GET') return send(res, 200, { players: social.search(me, new URL(req.url ?? '', 'http://x').searchParams.get('q')) });
    if (path === '/api/friends' && method === 'GET') return send(res, 200, social.list(me));
    const fr = /^\/api\/friends\/(request|accept|reject|remove|block|unblock)$/.exec(path);
    if (fr && method === 'POST') {
      const b = await readJson(req);
      if (fr[1] === 'request') social.request(me, String(b.code ?? b.id ?? ''));
      else {
        const id = String(b.id ?? '');
        if (!UUID.test(id)) throw new RoomError(400, 'bad id');
        social[fr[1] as 'accept' | 'reject' | 'remove' | 'block' | 'unblock'](me, id);
      }
      return send(res, 200, { ok: true });
    }
    const dm = /^\/api\/dm\/([0-9a-f-]{36})$/.exec(path);
    if (dm) {
      if (method === 'GET') return send(res, 200, { messages: social.dmHistory(me, dm[1]) });
      if (method === 'POST') return send(res, 200, social.sendDm(me, dm[1], (await readJson(req)).text));
    }
    if (path === '/api/chat' && method === 'GET') return send(res, 200, { messages: social.chatHistory(me) });
    if (path === '/api/chat' && method === 'POST') return send(res, 200, social.postChat(me, (await readJson(req)).text));
    if (path === '/api/chat/report' && method === 'POST') {
      const id = Number((await readJson(req)).id);
      if (!Number.isInteger(id)) throw new RoomError(400, 'bad id');
      social.report(me, id);
      return send(res, 200, { ok: true });
    }
    if (path === '/api/rankings' && method === 'GET') {
      const period = new URL(req.url ?? '', 'http://x').searchParams.get('period');
      if (period === 'ladder') return send(res, 200, { period, rows: ladder(db) });
      const kind = period === 'month' ? 'month' : 'week';
      return send(res, 200, { period: kind, since: periodStart(kind as Period, now()), rows: rankings(db, periodStart(kind as Period, now())) });
    }
    if (path === '/api/prizes' && method === 'GET') return send(res, 200, prizeInfo(db, me.id, now()));
    if (path === '/api/prizes/claim' && method === 'POST') {
      const id = Number((await readJson(req)).id);
      const r = Number.isInteger(id) ? claimPrize(db, me.id, id) : null;
      if (!r) throw new RoomError(404, 'no such unclaimed prize');
      return send(res, 200, r);
    }

    const m = /^\/api\/rooms\/([A-Z0-9]{5})\/(join|start|move|ready|events|rematch|leave|invite)$/.exec(path);
    if (!m) return send(res, 404, { error: 'not found' });
    const [, code, action] = m;

    if (method === 'GET' && action === 'events') {
      const r = rooms.get(code);
      rooms.seatOf(r, me.id);
      if (!openStream(res, me.id)) return;
      const off = rooms.connect(code, me.id, (v) => res.write(`data: ${JSON.stringify(v)}\n\n`), () => res.end());
      const ping = setInterval(() => res.write(': ping\n\n'), 20_000);
      res.on('close', () => { clearInterval(ping); off(); });
      return;
    }
    if (method !== 'POST') return send(res, 405, { error: 'method not allowed' });
    const b = await readJson(req);

    if (action === 'join') { rooms.join(code, me.id, me.name); return send(res, 200, { ok: true }); }
    if (action === 'start') { rooms.start(code, me.id, b.fillBots === true); return send(res, 200, { ok: true }); }
    if (action === 'rematch') { rooms.requestRematch(code, me.id); return send(res, 200, { ok: true }); }
    if (action === 'leave') { rooms.leave(code, me.id); return send(res, 200, { ok: true }); }
    if (action === 'invite') {
      const to = String(b.id ?? '');
      if (!UUID.test(to)) throw new RoomError(400, 'bad id');
      const r = rooms.get(code);
      rooms.seatOf(r, me.id);
      social.invite(me, to, { code, players: r.config.players });
      return send(res, 200, { ok: true });
    }
    if (action === 'ready') { rooms.readyNext(code, me.id); return send(res, 200, { ok: true }); }
    const ids = b.captureIds === undefined ? [] : b.captureIds;
    if (typeof b.cardId !== 'string' || !CARD_ID.test(b.cardId) || !Array.isArray(ids) || ids.length > 20 || !ids.every((x) => typeof x === 'string' && CARD_ID.test(x))) {
      throw new RoomError(400, 'bad move');
    }
    rooms.move(code, me.id, b.cardId, ids as string[]);
    return send(res, 200, { ok: true });
  }

  const server = createServer((req, res) => {
    // CORS '*' is deliberate: auth is a bearer token in the Authorization header, never a cookie,
    // so another site cannot ride a player's session; it lets the app run from any origin (web build, Capacitor).
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'authorization, content-type');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    handle(req, res).catch((e) => {
      if (res.headersSent) { res.end(); return; }
      if (e instanceof RoomError) send(res, e.status, { error: e.message });
      else { console.error(e); send(res, 500, { error: 'server error' }); }
    });
  });
  /**
   * Shutdown. Rooms live in memory only, so a match in progress cannot survive a restart: it ends as aborted
   * (no result, no trophy change) and its players get that final view before the streams close.
   */
  const close = () => {
    timers.forEach(clearInterval);
    queue.close();
    server.close(); // stop accepting
    rooms.abortAll();
    rooms.close();
    server.closeAllConnections();
    try { db.close(); } catch { /* already closed */ }
  };
  return { server, rooms, db, hub, social, queue, close };
}
