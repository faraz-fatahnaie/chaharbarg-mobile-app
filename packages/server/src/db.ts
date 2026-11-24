import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { FinishInfo } from './rooms';

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
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS players_fcode ON players (fcode)');
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

/** Guest account: the client keeps {id, token}; the server stores only a hash of the token. */
export function guestLogin(db: Db, name: string, id?: string, token?: string): Account & { token: string } {
  if (id && token) {
    const row = db.prepare('SELECT token_hash FROM players WHERE id = ?').get(id) as { token_hash: string } | undefined;
    if (row && same(row.token_hash, sha(token))) {
      db.prepare('UPDATE players SET name = ? WHERE id = ?').run(name, id);
      return { id, name, token };
    }
  }
  const nid = randomUUID();
  const ntoken = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO players (id, name, token_hash, created, fcode) VALUES (?, ?, ?, ?, ?)').run(nid, name, sha(ntoken), Date.now(), newFriendCode(db));
  return { id: nid, name, token: ntoken };
}

export function authenticate(db: Db, header: string | undefined): Account | null {
  const m = /^Bearer ([0-9a-f-]{36})\.([0-9a-f]{48})$/.exec(header ?? '');
  if (!m) return null;
  const row = db.prepare('SELECT id, name, token_hash FROM players WHERE id = ?').get(m[1]) as { id: string; name: string; token_hash: string } | undefined;
  if (!row || !same(row.token_hash, sha(m[2]))) return null;
  return { id: row.id, name: row.name };
}

export function recordResult(db: Db, f: FinishInfo) {
  const { lastInsertRowid } = db.prepare('INSERT INTO results (ts, players, target) VALUES (?, ?, ?)').run(Date.now(), f.config.players, f.config.target);
  const ins = db.prepare('INSERT INTO result_players (result_id, player_id, name, won, abandoned, coins) VALUES (?, ?, ?, ?, ?, ?)');
  for (const p of f.players) if (p.playerId) ins.run(lastInsertRowid, p.playerId, p.name, p.won ? 1 : 0, p.abandoned ? 1 : 0, p.won && !p.abandoned ? winCoins(f.config.players) : 0);
}
