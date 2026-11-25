import { tx, type Db } from './db';

export type Period = 'week' | 'month';
const DAY = 86_400_000;

/** Start (UTC ms) of the period containing `now`: weeks begin on Saturday, months on the 1st. */
export function periodStart(kind: Period, now: number): number {
  const d = new Date(now);
  if (kind === 'month') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const day0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return day0 - ((d.getUTCDay() + 1) % 7) * DAY; // Saturday = 6 -> 0 days back
}
const prevStart = (kind: Period, start: number) => (kind === 'week' ? start - 7 * DAY : periodStart('month', start - DAY));
const keyOf = (kind: Period, start: number) => `${kind}:${new Date(start).toISOString().slice(0, 10)}`;

/** Prizes per rank (Shahi, Gohar), no real money. [review] */
export const PRIZES: Record<Period, [number, number][]> = {
  week: [[500, 0], [300, 0], [150, 0]],
  month: [[2000, 3], [1200, 2], [600, 1]],
};

export interface Row { id: string; name: string; wins: number; games: number; coins: number }

export interface LadderRow { id: string; name: string; trophies: number }
export function ladder(db: Db, limit = 20): LadderRow[] {
  return db.prepare('SELECT id, name, trophies FROM players WHERE trophies > 0 ORDER BY trophies DESC, name ASC LIMIT ?').all(limit) as unknown as LadderRow[];
}

export function rankings(db: Db, from: number, to = Infinity, limit = 20): Row[] {
  return db.prepare(`
    SELECT rp.player_id AS id, p.name AS name, SUM(rp.won) AS wins, COUNT(*) AS games, SUM(rp.coins) AS coins
    FROM result_players rp JOIN results r ON r.id = rp.result_id JOIN players p ON p.id = rp.player_id
    WHERE r.ranked = 1 AND r.ts >= ? AND r.ts < ? GROUP BY rp.player_id HAVING wins > 0 ORDER BY wins DESC, coins DESC, games ASC, p.name ASC LIMIT ?
  `).all(from, to === Infinity ? Number.MAX_SAFE_INTEGER : to, limit) as unknown as Row[];
}

/** Awards the prizes of every finished period not awarded yet, back to the last awarded one or the first ranked result (idempotent). */
export function ensurePrizes(db: Db, now: number) {
  const first = (db.prepare('SELECT MIN(ts) t FROM results WHERE ranked = 1').get() as { t: number | null }).t;
  for (const kind of ['week', 'month'] as Period[]) {
    const last = (db.prepare('SELECT MAX(period) p FROM awarded WHERE period LIKE ?').get(`${kind}:%`) as { p: string | null }).p;
    tx(db, () => {
      for (let end = periodStart(kind, now), start = prevStart(kind, end); ; end = start, start = prevStart(kind, start)) {
        const key = keyOf(kind, start);
        if (last !== null && key <= last) break; // keys sort by date
        rankings(db, start, end, 3).forEach((r, i) => {
          const [shahi, gohar] = PRIZES[kind][i];
          db.prepare('INSERT OR IGNORE INTO prizes (period, rank, player_id, name, shahi, gohar) VALUES (?, ?, ?, ?, ?, ?)').run(key, i + 1, r.id, r.name, shahi, gohar);
        });
        db.prepare('INSERT OR IGNORE INTO awarded (period) VALUES (?)').run(key);
        if (first === null || start <= first) break;
      }
    });
  }
}

export function prizeInfo(db: Db, playerId: string, now: number) {
  ensurePrizes(db, now);
  const mine = db.prepare('SELECT id, period, rank, shahi, gohar FROM prizes WHERE player_id = ? AND claimed = 0').all(playerId);
  const latest = (kind: Period) => {
    const key = keyOf(kind, prevStart(kind, periodStart(kind, now)));
    return { period: key, winners: db.prepare('SELECT rank, name FROM prizes WHERE period = ? ORDER BY rank').all(key) };
  };
  return { mine, announcement: [latest('week'), latest('month')] };
}

/** Marks one prize claimed and returns what the client should add to its wallet; null if not yours or already claimed. */
export function claimPrize(db: Db, playerId: string, id: number): { shahi: number; gohar: number } | null {
  const r = db.prepare('UPDATE prizes SET claimed = 1 WHERE id = ? AND player_id = ? AND claimed = 0 RETURNING shahi, gohar').get(id, playerId) as { shahi: number; gohar: number } | undefined;
  return r ?? null;
}
