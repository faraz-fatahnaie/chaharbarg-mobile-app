import type { Db } from './db';
import { RoomError } from './rooms';

type Event = Record<string, unknown>;

/** Per-player push channel (friend requests, messages, chat). A player is "online" while any connection is open. */
export class Hub {
  private conns = new Map<string, Set<(e: Event) => void>>();
  add(id: string, send: (e: Event) => void) {
    let s = this.conns.get(id);
    if (!s) this.conns.set(id, (s = new Set()));
    s.add(send);
    return () => { s!.delete(send); if (!s!.size) this.conns.delete(id); };
  }
  notify(id: string, e: Event) { this.conns.get(id)?.forEach((f) => f(e)); }
  online(id: string) { return this.conns.has(id); }
  ids() { return [...this.conns.keys()]; }
}

export const MAX_DM = 500;
export const MAX_CHAT = 200;
export const CHAT_GAP_MS = 2000;
export const DM_GAP_MS = 500;
export const REPORTS_TO_HIDE = 3;
export const MUTE_MS = 10 * 60_000;
// Minimal word filter [review]: replace these with ***. A person should extend the list for Persian and English.
const BAD_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'کیر', 'کس', 'کون', 'جنده', 'حرامزاده'];
const filterText = (t: string) => BAD_WORDS.reduce((acc, w) => acc.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu'), '***'), t);
const cleanText = (x: unknown, max: number) => {
  const s = typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, ' ').trim() : '';
  if (!s || [...s].length > max) throw new RoomError(400, `message must be 1-${max} characters`);
  return s;
};

export class Social {
  private lastDm = new Map<string, number>();
  private lastChat = new Map<string, number>();
  constructor(private db: Db, private hub: Hub, private now: () => number = Date.now) {}

  private has(a: string, b: string, kind: string) { return !!this.db.prepare('SELECT 1 FROM relations WHERE a = ? AND b = ? AND kind = ?').get(a, b, kind); }
  private set(a: string, b: string, kind: string) { this.db.prepare('INSERT OR IGNORE INTO relations (a, b, kind, ts) VALUES (?, ?, ?, ?)').run(a, b, kind, this.now()); }
  private del(a: string, b: string, kind: string) { this.db.prepare('DELETE FROM relations WHERE a = ? AND b = ? AND kind = ?').run(a, b, kind); }
  isBlocked(a: string, b: string) { return this.has(a, b, 'block') || this.has(b, a, 'block'); }
  areFriends(a: string, b: string) { return this.has(a, b, 'friend'); }
  private nameOf(id: string) { return (this.db.prepare('SELECT name FROM players WHERE id = ?').get(id) as { name: string } | undefined)?.name ?? '?'; }

  code(id: string): string { return (this.db.prepare('SELECT fcode FROM players WHERE id = ?').get(id) as { fcode: string }).fcode; }

  request(me: { id: string; name: string }, fcode: string) {
    const t = this.db.prepare('SELECT id, name FROM players WHERE fcode = ?').get(String(fcode).toUpperCase()) as { id: string; name: string } | undefined;
    if (!t) throw new RoomError(404, 'no player with that code');
    if (t.id === me.id) throw new RoomError(400, 'that is your own code');
    if (this.isBlocked(me.id, t.id)) throw new RoomError(403, 'cannot send a request to this player');
    if (this.areFriends(me.id, t.id)) throw new RoomError(409, 'already friends');
    if (this.has(t.id, me.id, 'request')) return this.accept(me, t.id); // they asked first: just become friends
    this.set(me.id, t.id, 'request');
    this.hub.notify(t.id, { type: 'friend-request', from: { id: me.id, name: me.name } });
  }
  accept(me: { id: string; name: string }, id: string) {
    if (!this.has(id, me.id, 'request')) throw new RoomError(404, 'no such request');
    this.del(id, me.id, 'request');
    this.set(me.id, id, 'friend'); this.set(id, me.id, 'friend');
    this.hub.notify(id, { type: 'friend-accepted', from: { id: me.id, name: me.name } });
  }
  reject(me: { id: string }, id: string) { this.del(id, me.id, 'request'); }
  /** Unfriend, or cancel a request you sent. */
  remove(me: { id: string }, id: string) {
    for (const k of ['friend', 'request']) { this.del(me.id, id, k); this.del(id, me.id, k); }
  }
  block(me: { id: string }, id: string) {
    if (id === me.id || !this.db.prepare('SELECT 1 FROM players WHERE id = ?').get(id)) throw new RoomError(404, 'no such player');
    this.remove(me, id);
    this.set(me.id, id, 'block');
  }
  unblock(me: { id: string }, id: string) { this.del(me.id, id, 'block'); }

  list(me: { id: string }) {
    const rel = (sql: string) => this.db.prepare(sql).all(me.id) as { id: string; name: string }[];
    return {
      code: this.code(me.id),
      friends: rel("SELECT p.id, p.name FROM relations r JOIN players p ON p.id = r.b WHERE r.a = ? AND r.kind = 'friend' ORDER BY p.name").map((f) => ({ ...f, online: this.hub.online(f.id) })),
      incoming: rel("SELECT p.id, p.name FROM relations r JOIN players p ON p.id = r.a WHERE r.b = ? AND r.kind = 'request'"),
      outgoing: rel("SELECT p.id, p.name FROM relations r JOIN players p ON p.id = r.b WHERE r.a = ? AND r.kind = 'request'"),
      blocked: rel("SELECT p.id, p.name FROM relations r JOIN players p ON p.id = r.b WHERE r.a = ? AND r.kind = 'block'"),
    };
  }

  sendDm(me: { id: string; name: string }, to: string, text: unknown) {
    const t = cleanText(text, MAX_DM);
    if (!this.areFriends(me.id, to) || this.isBlocked(me.id, to)) throw new RoomError(403, 'you can only message friends');
    const last = this.lastDm.get(me.id) ?? 0;
    if (this.now() - last < DM_GAP_MS) throw new RoomError(429, 'slow down');
    this.lastDm.set(me.id, this.now());
    const { lastInsertRowid } = this.db.prepare('INSERT INTO dms (ts, sender, recipient, text) VALUES (?, ?, ?, ?)').run(this.now(), me.id, to, t);
    const msg = { id: Number(lastInsertRowid), ts: this.now(), from: me.id, to, text: t };
    this.hub.notify(to, { type: 'dm', msg, fromName: me.name });
    return msg;
  }
  dmHistory(me: { id: string }, withId: string) {
    if (!this.areFriends(me.id, withId)) throw new RoomError(403, 'not friends');
    return (this.db.prepare('SELECT id, ts, sender AS "from", recipient AS "to", text FROM dms WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?) ORDER BY id DESC LIMIT 50').all(me.id, withId, withId, me.id) as unknown[]).reverse();
  }

  // ---- public chat room (moderation: length cap, rate limit, word filter, mute, block, report) ----
  postChat(me: { id: string; name: string }, text: unknown) {
    const t = filterText(cleanText(text, MAX_CHAT));
    const mute = this.db.prepare('SELECT until FROM mutes WHERE player_id = ?').get(me.id) as { until: number } | undefined;
    if (mute && mute.until > this.now()) throw new RoomError(403, 'you are muted for a while');
    if (this.now() - (this.lastChat.get(me.id) ?? 0) < CHAT_GAP_MS) throw new RoomError(429, 'slow down');
    this.lastChat.set(me.id, this.now());
    const { lastInsertRowid } = this.db.prepare('INSERT INTO chat (ts, sender, name, text) VALUES (?, ?, ?, ?)').run(this.now(), me.id, me.name, t);
    const msg = { id: Number(lastInsertRowid), ts: this.now(), from: me.id, name: me.name, text: t };
    for (const id of this.hub.ids()) if (!this.isBlocked(id, me.id)) this.hub.notify(id, { type: 'chat', msg });
    return msg;
  }
  chatHistory(me: { id: string }) {
    const rows = this.db.prepare('SELECT id, ts, sender AS "from", name, text FROM chat WHERE hidden = 0 ORDER BY id DESC LIMIT 50').all() as { from: string }[];
    return rows.filter((m) => !this.isBlocked(me.id, m.from)).reverse();
  }
  report(me: { id: string }, msgId: number) {
    const m = this.db.prepare('SELECT sender FROM chat WHERE id = ?').get(msgId) as { sender: string } | undefined;
    if (!m) throw new RoomError(404, 'no such message');
    if (m.sender === me.id) throw new RoomError(400, 'you cannot report yourself');
    this.db.prepare('INSERT OR IGNORE INTO chat_reports (msg_id, reporter) VALUES (?, ?)').run(msgId, me.id);
    const n = (this.db.prepare('SELECT COUNT(*) n FROM chat_reports WHERE msg_id = ?').get(msgId) as { n: number }).n;
    if (n >= REPORTS_TO_HIDE) {
      this.db.prepare('UPDATE chat SET hidden = 1 WHERE id = ?').run(msgId);
      this.db.prepare('INSERT OR REPLACE INTO mutes (player_id, until) VALUES (?, ?)').run(m.sender, this.now() + MUTE_MS);
      for (const id of this.hub.ids()) this.hub.notify(id, { type: 'chat-hide', id: msgId });
    }
  }
}
