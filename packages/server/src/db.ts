import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { RoomError, type FinishInfo } from './rooms';

/** Coins the server awards for an online win (shown in rankings; separate from the local Shahi wallet). */
export const winCoins = (players: number) => 25 * players;

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function openDb(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS results (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, players INTEGER NOT NULL, target INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS relations (a TEXT NOT NULL, b TEXT NOT NULL, kind TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (a, b, kind));
    CREATE TABLE IF NOT EXISTS dms (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, sender TEXT NOT NULL, recipient TEXT NOT NULL, text TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, sender TEXT NOT NULL, name TEXT NOT NULL, text TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS chat_reports (msg_id INTEGER NOT NULL, reporter TEXT NOT NULL, PRIMARY KEY (msg_id, reporter));
    CREATE TABLE IF NOT EXISTS mutes (player_id TEXT PRIMARY KEY, until INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS awarded (period TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS prizes (id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT NOT NULL, rank INTEGER NOT NULL, player_id TEXT NOT NULL, name TEXT NOT NULL, shahi INTEGER NOT NULL, gohar INTEGER NOT NULL, claimed INTEGER NOT NULL DEFAULT 0, UNIQUE (period, rank));
    CREATE TABLE IF NOT EXISTS result_players (result_id INTEGER NOT NULL, player_id TEXT, name TEXT NOT NULL, won INTEGER NOT NULL, abandoned INTEGER NOT NULL, coins INTEGER NOT NULL);
  `);
  try { db.exec('ALTER TABLE players ADD COLUMN fcode TEXT'); } catch { /* column exists */ }
  try { db.exec('ALTER TABLE players ADD COLUMN trophies INTEGER NOT NULL DEFAULT 0'); } catch { /* column exists */ }
  // Older databases: results before this column existed count as unranked (they may include bot or friendly games).
  try { db.exec('ALTER TABLE results ADD COLUMN ranked INTEGER NOT NULL DEFAULT 0'); } catch { /* column exists */ }
  try { db.exec('ALTER TABLE chat_reports ADD COLUMN ts INTEGER NOT NULL DEFAULT 0'); } catch { /* column exists */ }
  try { db.exec('ALTER TABLE players ADD COLUMN token_seen INTEGER NOT NULL DEFAULT 0'); } catch { /* column exists */ }
  // rows from before token expiry existed count as used now, so nobody is signed out by the upgrade
  db.prepare('UPDATE players SET token_seen = ? WHERE token_seen = 0').run(Date.now());
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS players_fcode ON players (fcode)');
  db.exec('CREATE INDEX IF NOT EXISTS result_players_player ON result_players (player_id, result_id)'); // pair cooldown + rankings
  for (const r of db.prepare('SELECT id FROM players WHERE fcode IS NULL').all() as { id: string }[]) db.prepare('UPDATE players SET fcode = ? WHERE id = ?').run(newFriendCode(db), r.id);
  return db;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Short code players share to be found as friends. */
function newFriendCode(db: DatabaseSync): string {
  for (;;) {
    const c = Array.from(randomBytes(6), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
    if (!db.prepare('SELECT 1 FROM players WHERE fcode = ?').get(c)) return c;
  }
}
export type Db = ReturnType<typeof openDb>;

export interface Account { id: string; name: string }

/** A token unused this long stops working (sliding: every use renews it). */
export const TOKEN_TTL_MS = 90 * 24 * 3600 * 1000;

/** The account for id+secret when the token is valid and not expired; renews its last-use time. */
function liveToken(db: Db, id: string, secret: string, now: number): Account | null {
  const row = db.prepare('SELECT id, name, token_hash, token_seen FROM players WHERE id = ?').get(id) as
    { id: string; name: string; token_hash: string; token_seen: number } | undefined;
  if (!row || !same(row.token_hash, sha(secret)) || now - row.token_seen > TOKEN_TTL_MS) return null;
  db.prepare('UPDATE players SET token_seen = ? WHERE id = ?').run(Math.max(now, row.token_seen), id);
  return { id: row.id, name: row.name };
}

/** Guest account: the client keeps {id, token}; the server stores only a hash of the token. */
export function guestLogin(db: Db, name: string, id?: string, token?: string, mayCreate: () => boolean = () => true, now = Date.now()): Account & { token: string } {
  if (id && token && liveToken(db, id, token, now)) {
    db.prepare('UPDATE players SET name = ? WHERE id = ?').run(name, id);
    return { id, name, token };
  }
  if (!mayCreate()) throw new RoomError(429, 'too many new accounts, try again later');
  const nid = randomUUID();
  const ntoken = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO players (id, name, token_hash, created, fcode, token_seen) VALUES (?, ?, ?, ?, ?, ?)').run(nid, name, sha(ntoken), now, newFriendCode(db), now);
  return { id: nid, name, token: ntoken };
}

export function authenticate(db: Db, header: string | undefined, now = Date.now()): Account | null {
  const m = /^Bearer ([0-9a-f-]{36})\.([0-9a-f]{48})$/.exec(header ?? '');
  return m ? liveToken(db, m[1], m[2], now) : null;
}

/** Logout: the stored hash no longer matches any token, so this one is dead for good. */
export function revokeToken(db: Db, id: string) {
  db.prepare("UPDATE players SET token_hash = 'revoked' WHERE id = ?").run(id);
}

/** Ladder trophies (ranked matches only): +25 for a win, -12 for a loss or abandoning, never below 0. Same values as the offline arenas. */
export const WIN_TROPHIES = 25;
export const LOSS_TROPHIES = 12;
export const trophiesOf = (db: Db, id: string) => (db.prepare('SELECT trophies FROM players WHERE id = ?').get(id) as { trophies: number } | undefined)?.trophies ?? 0;

/** Runs `fn` in one SQLite transaction: all of its writes land, or none. */
export function tx<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN');
  try { const v = fn(); db.exec('COMMIT'); return v; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** A ranked match between players who met in a counted ranked match this recently changes no trophies and no rankings (anti-collusion). */
export const PAIR_COOLDOWN_MS = 30 * 60_000;

function metRecently(db: Db, ids: string[], since: number): boolean {
  const q = db.prepare(`SELECT 1 FROM results r JOIN result_players a ON a.result_id = r.id JOIN result_players b ON b.result_id = r.id
    WHERE r.ranked = 1 AND r.ts >= ? AND a.player_id = ? AND b.player_id = ? LIMIT 1`);
  return ids.some((a, i) => ids.slice(i + 1).some((b) => !!q.get(since, a, b)));
}

/**
 * Records a finished match and, for ranked rooms, applies ladder trophies, in one transaction.
 * It counts for trophies and rankings only when the room is ranked, every seat is a real player (no bots),
 * and no two of the players met in a counted ranked match within PAIR_COOLDOWN_MS. Returns per-seat deltas for ranked rooms.
 */
export function finishMatch(db: Db, f: FinishInfo, now = Date.now()): (number | null)[] | undefined {
  return tx(db, () => {
    const ids = f.players.flatMap((p) => (p.playerId ? [p.playerId] : []));
    const counts = f.ranked && ids.length === f.players.length && !metRecently(db, ids, now - PAIR_COOLDOWN_MS);
    recordResult(db, f, counts, now);
    if (!f.ranked) return undefined;
    return counts ? applyTrophies(db, f) : f.players.map((p) => (p.playerId ? 0 : null));
  });
}

export function applyTrophies(db: Db, f: FinishInfo): (number | null)[] {
  return f.players.map((p) => {
    if (!p.playerId) return null;
    const before = trophiesOf(db, p.playerId);
    const after = p.won && !p.abandoned ? before + WIN_TROPHIES : Math.max(0, before - LOSS_TROPHIES);
    db.prepare('UPDATE players SET trophies = ? WHERE id = ?').run(after, p.playerId);
    return after - before;
  });
}

/** `ranked`: whether this result counts for rankings and prizes (see finishMatch). */
export function recordResult(db: Db, f: FinishInfo, ranked = false, now = Date.now()) {
  const { lastInsertRowid } = db.prepare('INSERT INTO results (ts, players, target, ranked) VALUES (?, ?, ?, ?)').run(now, f.config.players, f.config.target, ranked ? 1 : 0);
  const ins = db.prepare('INSERT INTO result_players (result_id, player_id, name, won, abandoned, coins) VALUES (?, ?, ?, ?, ?, ?)');
  for (const p of f.players) if (p.playerId) ins.run(lastInsertRowid, p.playerId, p.name, p.won ? 1 : 0, p.abandoned ? 1 : 0, p.won && !p.abandoned ? winCoins(f.config.players) : 0);
}

/** Chat, direct messages and chat reports older than this are deleted (on startup and daily). */
export const RETENTION_MS = 90 * 86_400_000;
export function pruneOld(db: Db, now = Date.now()) {
  const before = now - RETENTION_MS;
  tx(db, () => {
    db.prepare('DELETE FROM chat WHERE ts < ?').run(before);
    db.prepare('DELETE FROM dms WHERE ts < ?').run(before);
    db.prepare('DELETE FROM chat_reports WHERE ts < ? OR msg_id NOT IN (SELECT id FROM chat)').run(before);
  });
}
