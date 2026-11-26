import type { Db } from './db';
import { trophiesOf } from './db';
import type { Hub } from './social';
import { RoomError, type Rooms } from './rooms';

interface Entry { id: string; name: string; players: 2 | 3 | 4; trophies: number; since: number }

/** Trophy gap allowed between matched players: starts at 150 and grows by 100 every 10 s of waiting. */
export const windowAt = (waitedMs: number) => 150 + Math.floor(waitedMs / 10_000) * 100;
export const QUEUE_TARGET = { 2: 35, 3: 35, 4: 65 } as const; // the short goal for each size

/** Random-opponent matchmaking for ranked (trophy) matches. */
export class Queue {
  private entries = new Map<string, Entry>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private db: Db, private hub: Hub, private rooms: Rooms, private now: () => number = Date.now, tickMs = 1000) {
    if (tickMs > 0) { this.timer = setInterval(() => { try { this.tick(); } catch (e) { console.error('queue tick failed', e); } }, tickMs); this.timer.unref?.(); }
  }

  join(me: { id: string; name: string }, players: number) {
    if (players !== 2 && players !== 3 && players !== 4) throw new RoomError(400, 'players must be 2, 3 or 4');
    if (!this.hub.online(me.id)) throw new RoomError(409, 'open the live connection first');
    this.entries.set(me.id, { id: me.id, name: me.name, players, trophies: trophiesOf(this.db, me.id), since: this.now() });
    this.tick();
  }
  leave(id: string) { this.entries.delete(id); }
  has(id: string) { return this.entries.has(id); }
  size() { return this.entries.size; }
  close() { if (this.timer) clearInterval(this.timer); }

  /** Forms every match that is possible right now; drops players who went offline. */
  tick() {
    for (const e of [...this.entries.values()]) if (!this.hub.online(e.id)) this.entries.delete(e.id);
    const now = this.now();
    for (const size of [2, 3, 4] as const) {
      for (;;) {
        const group = [...this.entries.values()].filter((e) => e.players === size).sort((a, b) => a.since - b.since);
        let made: Entry[] | null = null;
        for (const anchor of group) {
          const w = windowAt(now - anchor.since);
          const near = group.filter((e) => e !== anchor && Math.abs(e.trophies - anchor.trophies) <= w)
            .sort((a, b) => Math.abs(a.trophies - anchor.trophies) - Math.abs(b.trophies - anchor.trophies));
          if (near.length >= size - 1) { made = [anchor, ...near.slice(0, size - 1)]; break; }
        }
        if (!made) break;
        // the entries leave the queue first, so a failure cannot loop forever; the players can queue again
        try { this.startMatch(made, size); } catch (e) { console.error('matchmaking failed', e); }
      }
    }
  }

  private startMatch(entries: Entry[], size: 2 | 3 | 4) {
    entries.forEach((e) => this.entries.delete(e.id));
    const [host, ...rest] = entries;
    const room = this.rooms.create(host.id, host.name, size, QUEUE_TARGET[size], 15, true);
    rest.forEach((e) => this.rooms.join(room.code, e.id, e.name));
    this.rooms.start(room.code, host.id, false);
    entries.forEach((e) => this.hub.notify(e.id, { type: 'match-found', code: room.code }));
  }
}
