import {
  DEFAULT_RULES, chooseMove, matchNextDeal, matchPlay, mulberry32, newMatch, targetOptions, timeoutMove, unitOf,
  type Card, type MatchState, type Rng, type RulesConfig,
} from '@chaharbarg/engine';

export const MAX_TIMEOUTS = 3;
export type TimerMode = 0 | 5 | 15; // seconds per turn; 0 = off (a 60 s idle limit still applies)

export interface Seat { playerId: string | null; name: string; bot: boolean; timeouts: number; abandoned: boolean; left?: boolean }

export interface Room {
  code: string;
  hostId: string;
  config: RulesConfig;
  timer: TimerMode;
  status: 'lobby' | 'playing' | 'over';
  seats: Seat[];
  match: MatchState | null;
  /** epoch ms when the current turn times out */
  deadline: number | null;
  ready: Set<number>;
  /** ranked = found by matchmaking and worth ladder trophies; friendly = private room (friends or bots), no trophies */
  ranked: boolean;
  /** seats that asked for a rematch */
  rematch: Set<number>;
  /** ladder trophy change per seat once a ranked match is over */
  deltas: (number | null)[] | null;
  /** matches started in this room (1 after start, +1 per rematch) */
  games: number;
}

/** What one seat is allowed to see: other hands and the stock are same-length placeholders. */
export interface RoomView {
  code: string;
  status: Room['status'];
  mySeat: number;
  hostId: string;
  config: RulesConfig;
  timer: TimerMode;
  seats: { name: string; bot: boolean; connected: boolean; abandoned: boolean }[];
  match: MatchState | null;
  deadline: number | null;
  ready: number[];
  ranked: boolean;
  rematch: number[];
  deltas: (number | null)[] | null;
  games: number;
}

export interface FinishInfo {
  config: RulesConfig;
  /** per seat */
  players: { playerId: string | null; name: string; won: boolean; abandoned: boolean }[];
  winnerUnit: number | null;
  ranked: boolean;
}

export interface RoomsOptions {
  rng?: Rng;
  now?: () => number;
  /** pause after a deal before the next one starts (ms) */
  dealPauseMs?: number;
  /** thinking time of a bot seat (ms) */
  botDelayMs?: number;
  /** turn limit when the room timer is off (ms) */
  idleLimitMs?: number;
  /** milliseconds per timer second (1000; tests shrink it) */
  secondMs?: number;
  /** may return the ladder trophy change per seat (ranked matches) */
  onFinish?: (info: FinishInfo) => (number | null)[] | void;
}

export class RoomError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const hidden = (n: number, tag: string): Card[] => Array.from({ length: n }, (_, i) => ({ id: `${tag}${i}`, suit: 'S', rank: 1 }));

export class Rooms {
  private rooms = new Map<string, Room>();
  private listeners = new Map<string, Map<string, Set<(v: RoomView) => void>>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private rng: Rng;
  private now: () => number;
  private dealPauseMs: number;
  private botDelayMs: number;
  private idleLimitMs: number;
  private secondMs: number;
  private onFinish: (i: FinishInfo) => (number | null)[] | void;

  constructor(o: RoomsOptions = {}) {
    this.rng = o.rng ?? mulberry32(Date.now() ^ (Math.random() * 2 ** 32));
    this.now = o.now ?? Date.now;
    this.dealPauseMs = o.dealPauseMs ?? 6000;
    this.botDelayMs = o.botDelayMs ?? 900;
    this.idleLimitMs = o.idleLimitMs ?? 60_000;
    this.secondMs = o.secondMs ?? 1000;
    this.onFinish = o.onFinish ?? (() => {});
  }

  get(code: string): Room {
    const r = this.rooms.get(code);
    if (!r) throw new RoomError(404, 'no such room');
    return r;
  }

  create(playerId: string, name: string, players: number, target: number, timer: number, ranked = false): Room {
    if (players !== 2 && players !== 3 && players !== 4) throw new RoomError(400, 'players must be 2, 3 or 4');
    if (!(targetOptions(players) as readonly number[]).includes(target)) throw new RoomError(400, 'target not allowed');
    if (timer !== 0 && timer !== 5 && timer !== 15) throw new RoomError(400, 'timer must be 0, 5 or 15');
    let code = '';
    do code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(this.rng() * CODE_CHARS.length)]).join('');
    while (this.rooms.has(code));
    const room: Room = {
      code, hostId: playerId, timer: timer as TimerMode, status: 'lobby', match: null, deadline: null, ready: new Set(), ranked, rematch: new Set(), deltas: null, games: 0,
      config: { ...DEFAULT_RULES, players, target: target as RulesConfig['target'] },
      seats: [{ playerId, name, bot: false, timeouts: 0, abandoned: false }],
    };
    this.rooms.set(code, room);
    return room;
  }

  join(code: string, playerId: string, name: string): Room {
    const r = this.get(code);
    if (r.seats.some((s) => s.playerId === playerId)) return r; // rejoin
    if (r.status !== 'lobby') throw new RoomError(409, 'the game already started');
    if (r.seats.length >= r.config.players) throw new RoomError(409, 'room is full');
    r.seats.push({ playerId, name, bot: false, timeouts: 0, abandoned: false });
    this.publish(r);
    return r;
  }

  /** Leaving: a lobby seat is freed (the host leaving closes the room); after a match the seat stops counting for a rematch. */
  leave(code: string, playerId: string): void {
    const r = this.get(code);
    const i = this.seatOf(r, playerId);
    if (r.status === 'lobby') {
      if (r.hostId === playerId) { this.rooms.delete(code); this.listeners.delete(code); return; }
      r.seats.splice(i, 1);
    } else if (r.status === 'over') {
      r.seats[i].left = true;
      r.rematch.delete(i);
      this.maybeRematch(r);
    } else return;
    this.publish(r);
  }

  /** Friendly rooms only: when every human still at the table asks, a new match starts with the same seats and rules. */
  requestRematch(code: string, playerId: string): void {
    const r = this.get(code);
    const i = this.seatOf(r, playerId);
    if (r.ranked) throw new RoomError(409, 'ranked matches have no rematch');
    if (r.status !== 'over') throw new RoomError(409, 'the match is not over');
    r.seats[i].left = false;
    r.rematch.add(i);
    this.maybeRematch(r);
    this.publish(r);
  }

  private maybeRematch(r: Room) {
    const humans = r.seats.flatMap((s, i) => (s.playerId && !s.left ? [i] : []));
    if (!humans.length || !humans.every((i) => r.rematch.has(i))) return;
    r.seats.forEach((s) => { if (s.playerId) { s.bot = false; s.abandoned = false; } s.timeouts = 0; });
    r.rematch = new Set();
    r.deltas = null;
    r.status = 'playing';
    r.games++;
    r.match = newMatch(r.config, this.rng);
    this.afterChange(r);
  }

  /** Host starts the game; with fillBots the empty seats are played by bots. */
  start(code: string, playerId: string, fillBots: boolean): Room {
    const r = this.get(code);
    if (r.hostId !== playerId) throw new RoomError(403, 'only the host can start');
    if (r.status !== 'lobby') throw new RoomError(409, 'already started');
    if (r.seats.length < r.config.players && !fillBots) throw new RoomError(409, 'waiting for players');
    while (r.seats.length < r.config.players) r.seats.push({ playerId: null, name: `Bot ${r.seats.length}`, bot: true, timeouts: 0, abandoned: false });
    r.status = 'playing';
    r.games++;
    r.match = newMatch(r.config, this.rng);
    this.afterChange(r);
    return r;
  }

  seatOf(r: Room, playerId: string): number {
    const i = r.seats.findIndex((s) => s.playerId === playerId);
    if (i < 0) throw new RoomError(403, 'you are not in this room');
    return i;
  }

  move(code: string, playerId: string, cardId: string, captureIds: string[]): void {
    const r = this.get(code);
    const seat = this.seatOf(r, playerId);
    const m = r.match;
    if (r.status !== 'playing' || !m || m.phase !== 'playing') throw new RoomError(409, 'no deal in progress');
    if (m.deal.turn !== seat) throw new RoomError(409, 'not your turn');
    try {
      r.match = matchPlay(m, cardId, captureIds);
    } catch (e) {
      throw new RoomError(400, `illegal move: ${(e as Error).message}`);
    }
    r.seats[seat].timeouts = 0;
    this.afterChange(r);
  }

  /** A player is done reading the deal summary; when every human is, the next deal starts at once. */
  readyNext(code: string, playerId: string): void {
    const r = this.get(code);
    const seat = this.seatOf(r, playerId);
    if (r.match?.phase !== 'dealOver') return;
    r.ready.add(seat);
    if (r.seats.every((s, i) => s.bot || r.ready.has(i))) this.nextDeal(r);
    else this.publish(r);
  }

  /** Subscribe a player's connection; returns the unsubscribe function. */
  connect(code: string, playerId: string, send: (v: RoomView) => void): () => void {
    const r = this.get(code);
    this.seatOf(r, playerId);
    let byPlayer = this.listeners.get(code);
    if (!byPlayer) this.listeners.set(code, (byPlayer = new Map()));
    let set = byPlayer.get(playerId);
    if (!set) byPlayer.set(playerId, (set = new Set()));
    set.add(send);
    this.publish(r);
    return () => {
      set!.delete(send);
      if (!set!.size) byPlayer!.delete(playerId);
      if (this.rooms.has(code)) this.publish(r);
    };
  }

  view(r: Room, seat: number): RoomView {
    const m = r.match;
    let match: MatchState | null = null;
    if (m) {
      const d = m.deal;
      match = {
        ...m,
        deal: { ...d, hands: d.hands.map((h, i) => (i === seat ? h : hidden(h.length, `h${i}-`))), stock: hidden(d.stock.length, 's') },
      };
    }
    const byPlayer = this.listeners.get(r.code);
    return {
      code: r.code, status: r.status, mySeat: seat, hostId: r.hostId, config: r.config, timer: r.timer,
      seats: r.seats.map((s) => ({ name: s.name, bot: s.bot, connected: s.bot || (!!s.playerId && !!byPlayer?.get(s.playerId)?.size), abandoned: s.abandoned })),
      match, deadline: r.deadline, ready: [...r.ready], ranked: r.ranked, rematch: [...r.rematch], deltas: r.deltas, games: r.games,
    };
  }

  private publish(r: Room) {
    const byPlayer = this.listeners.get(r.code);
    if (!byPlayer) return;
    r.seats.forEach((s, i) => {
      if (!s.playerId) return;
      const view = this.view(r, i);
      byPlayer.get(s.playerId)?.forEach((send) => send(view));
    });
  }

  private clearTimer(code: string) {
    const t = this.timers.get(code);
    if (t) clearTimeout(t);
    this.timers.delete(code);
  }

  private later(r: Room, ms: number, fn: () => void) {
    this.clearTimer(r.code);
    this.timers.set(r.code, setTimeout(() => { this.timers.delete(r.code); fn(); }, ms));
  }

  /** Decide what happens next after any state change: finish, pause between deals, or wait for the player on turn. */
  private afterChange(r: Room) {
    const m = r.match!;
    r.deadline = null;
    if (m.phase === 'matchOver') {
      this.clearTimer(r.code);
      r.status = 'over';
      const winners = new Set(r.seats.flatMap((_, i) => (unitOf(r.config.players, i) === m.winner ? [i] : [])));
      r.deltas = this.onFinish({
        config: r.config, winnerUnit: m.winner, ranked: r.ranked,
        players: r.seats.map((s, i) => ({ playerId: s.playerId, name: s.name, won: winners.has(i), abandoned: s.abandoned })),
      }) ?? null;
    } else if (m.phase === 'dealOver') {
      r.ready = new Set();
      this.later(r, this.dealPauseMs, () => this.nextDeal(r));
    } else {
      const seat = r.seats[m.deal.turn];
      if (seat.bot) {
        this.later(r, this.botDelayMs, () => this.botMove(r));
      } else {
        const ms = r.timer ? r.timer * this.secondMs : this.idleLimitMs;
        r.deadline = this.now() + ms;
        this.later(r, ms, () => this.timeout(r));
      }
    }
    this.publish(r);
  }

  private nextDeal(r: Room) {
    if (r.status !== 'playing' || r.match?.phase !== 'dealOver') return;
    r.match = matchNextDeal(r.match, this.rng);
    r.ready = new Set();
    this.afterChange(r);
  }

  private botMove(r: Room) {
    const m = r.match;
    if (r.status !== 'playing' || !m || m.phase !== 'playing') return;
    const mv = chooseMove(m.deal, m.deal.turn, 'medium', this.rng);
    r.match = matchPlay(m, mv.cardId, mv.captureIds);
    this.afterChange(r);
  }

  /** The player on turn ran out of time: play for them; after MAX_TIMEOUTS in a row a bot takes the seat for good. */
  private timeout(r: Room) {
    const m = r.match;
    if (r.status !== 'playing' || !m || m.phase !== 'playing') return;
    const seat = r.seats[m.deal.turn];
    if (++seat.timeouts >= MAX_TIMEOUTS) { seat.bot = true; seat.abandoned = true; }
    const mv = timeoutMove(m.deal, m.deal.turn, this.rng);
    r.match = matchPlay(m, mv.cardId, mv.captureIds);
    this.afterChange(r);
  }

  /** For tests and shutdown. */
  close() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }
}
