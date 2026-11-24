import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { applyTrophies, authenticate, guestLogin, openDb, recordResult, trophiesOf, type Db } from './db';
import { Queue } from './queue';
import { RoomError, Rooms, type RoomsOptions } from './rooms';
import { Hub, Social } from './social';
import { claimPrize, ladder, periodStart, prizeInfo, rankings, type Period } from './rankings';

const MAX_BODY = 4096;
const UUID = /^[0-9a-f-]{36}$/;
const CARD_ID = /^[SHDC](1[0-3]|[1-9])$/;
const cleanName = (x: unknown) => {
  const s = typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, '').trim() : '';
  if (!s || [...s].length > 24) throw new RoomError(400, 'name must be 1-24 characters');
  return s;
};

export interface ServerOptions extends RoomsOptions { db?: Db; queueTickMs?: number }

export function createApp(opts: ServerOptions = {}) {
  const db = opts.db ?? openDb();
  const rooms = new Rooms({
    ...opts,
    onFinish: (f) => { recordResult(db, f); opts.onFinish?.(f); return f.ranked ? applyTrophies(db, f) : undefined; },
  });

  const hub = new Hub();
  const now = opts.now ?? Date.now;
  const social = new Social(db, hub, now);
  const queue = new Queue(db, hub, rooms, now, opts.queueTickMs);

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

    if (method === 'POST' && path === '/api/guest') {
      const b = await readJson(req);
      const a = guestLogin(db, cleanName(b.name), typeof b.id === 'string' ? b.id : undefined, typeof b.token === 'string' ? b.token : undefined);
      return send(res, 200, { id: a.id, token: `${a.id}.${a.token}`, name: a.name });
    }

    const me = authenticate(db, req.headers.authorization);
    if (!me) return send(res, 401, { error: 'sign in first' });

    if (method === 'POST' && path === '/api/rooms') {
      const b = await readJson(req);
      const r = rooms.create(me.id, me.name, Number(b.players), Number(b.target), Number(b.timer ?? 0));
      return send(res, 200, { code: r.code });
    }

    // ---- account, friends, direct messages, public chat, rankings, prizes ----
    if (path === '/api/me' && method === 'GET') return send(res, 200, { id: me.id, name: me.name, code: social.code(me.id), trophies: trophiesOf(db, me.id), queued: queue.has(me.id) });
    if (path === '/api/me/events' && method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write(': hello\n\n');
      const off = hub.add(me.id, (e) => res.write(`data: ${JSON.stringify(e)}\n\n`));
      const ping = setInterval(() => res.write(': ping\n\n'), 20_000);
      req.on('close', () => { clearInterval(ping); off(); if (!hub.online(me.id)) queue.leave(me.id); });
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
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      const off = rooms.connect(code, me.id, (v) => res.write(`data: ${JSON.stringify(v)}\n\n`));
      const ping = setInterval(() => res.write(': ping\n\n'), 20_000);
      req.on('close', () => { clearInterval(ping); off(); });
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
  return { server, rooms, db, hub, social, queue, close: () => { queue.close(); rooms.close(); server.closeAllConnections(); server.close(); } };
}
