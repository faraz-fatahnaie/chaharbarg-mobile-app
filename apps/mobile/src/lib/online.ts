import type { MatchState, RulesConfig } from '@chaharbarg/engine';

/** What the server sends a seat (see packages/server/src/rooms.ts). Other hands and the stock are placeholders. */
export interface RoomView {
  code: string;
  status: 'lobby' | 'playing' | 'over';
  mySeat: number;
  hostId: string;
  config: RulesConfig;
  timer: 0 | 5 | 15;
  seats: { name: string; bot: boolean; connected: boolean; abandoned: boolean }[];
  match: MatchState | null;
  deadline: number | null;
  ready: number[];
  ranked: boolean;
  rematch: number[];
  deltas: (number | null)[] | null;
  games: number;
  /** true on the last view of a room the server shut down; no more views follow */
  aborted?: boolean;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** localhost, 127/8, private IPv4 ranges, .local names, and IPv6 loopback / unique-local / link-local literals. */
const isLocalHost = (h: string) =>
  h === 'localhost' || h.endsWith('.local') || /^(127|10)\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  || h === '[::1]' || /^\[f[cd][0-9a-f]{0,2}:/i.test(h) || /^\[fe[89ab][0-9a-f]:/i.test(h);

/** A server address the app may use: https anywhere, http only for local/LAN hosts or a dev build. Paths are allowed;
 *  credentials, query and fragment are not. Returns the cleaned address, or null. */
export function validServerUrl(v: string, dev: boolean = import.meta.env.DEV): string | null {
  const s = v.trim().replace(/\/+$/, '');
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (!u.hostname || u.username || u.password || u.search || u.hash) return null;
  if (u.protocol === 'http:' && !dev && !isLocalHost(u.hostname)) return null;
  return s;
}

/** Server address: one chosen in the app, else VITE_SERVER_URL, else port 8787 on the host serving the app (a phone on the same Wi-Fi). */
const SERVER_KEY = 'chaharbarg.server.v1';
const defaultServer = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? `${location.protocol}//${location.hostname}:8787`;
let SERVER_URL: string = (() => { try { return validServerUrl(localStorage.getItem(SERVER_KEY) ?? '') ?? defaultServer; } catch { return defaultServer; } })();
export const getServerUrl = () => SERVER_URL;
/** Saves a new server address (see validServerUrl); an empty value goes back to the default. Returns false if it is not allowed. */
export function setServerUrl(v: string): boolean {
  const s = v.trim() ? validServerUrl(v) : '';
  if (s === null) return false;
  try { if (s) localStorage.setItem(SERVER_KEY, s); else localStorage.removeItem(SERVER_KEY); } catch { return false; }
  return true;
}

// Credentials live in localStorage. `?as=name` gives a separate identity per tab, so two tabs can play each other on one device.
const as = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('as') : null;
const CRED_KEY = `chaharbarg.online.v1${as ? `:${as}` : ''}`;

interface Cred { id: string; token: string }

function loadCred(): Cred | null {
  try {
    const c = JSON.parse(localStorage.getItem(CRED_KEY) ?? 'null') as Cred | null;
    return c && typeof c.id === 'string' && typeof c.token === 'string' ? c : null;
  } catch {
    return null;
  }
}

let token = '';

async function call<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(SERVER_URL + path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error(isObj(json) && typeof json.error === 'string' ? json.error.slice(0, 200) : `server error ${res.status}`);
  return (isObj(json) ? json : {}) as T;
}

/** Signs in as a guest (creating the account on first use); returns the player id. */
export async function signIn(name: string): Promise<string> {
  const c = loadCred();
  // the stored token is `id.secret`; /api/guest takes the bare secret (server db.ts guestLogin hashes it), so the split is required
  const r = await call<{ id: string; token: string }>('POST', '/api/guest', { name, id: c?.id, token: c ? c.token.split('.')[1] : undefined });
  token = r.token;
  try { localStorage.setItem(CRED_KEY, JSON.stringify({ id: r.id, token: r.token })); } catch { /* private mode */ }
  return r.id;
}

export const createRoom = (players: number, target: number, timer: number) => call<{ code: string }>('POST', '/api/rooms', { players, target, timer });
export const joinRoom = (code: string) => call('POST', `/api/rooms/${code}/join`, {});
export const startRoom = (code: string, fillBots: boolean) => call('POST', `/api/rooms/${code}/start`, { fillBots });
export const sendMove = (code: string, cardId: string, captureIds: string[]) => call('POST', `/api/rooms/${code}/move`, { cardId, captureIds });
export const joinQueue = (players: number) => call('POST', '/api/queue', { players });
export const leaveQueue = () => call('POST', '/api/queue/leave', {});
export const rematch = (code: string) => call('POST', `/api/rooms/${code}/rematch`, {});
export const leaveRoom = (code: string) => call('POST', `/api/rooms/${code}/leave`, {});
export const inviteFriend = (code: string, id: string) => call('POST', `/api/rooms/${code}/invite`, { id });
export const getMe = () => call<{ id: string; name: string; code: string; trophies: number; queued: boolean }>('GET', '/api/me');
export const searchPlayers = (q: string) => call<{ players: Person[] }>('GET', `/api/players/search?q=${encodeURIComponent(q)}`);
export const friendRequestById = (id: string) => call('POST', '/api/friends/request', { id });
export const sendReady = (code: string) => call('POST', `/api/rooms/${code}/ready`, {});

/**
 * Splits buffered server-sent-event text into complete frames and returns each frame's data (several `data:` lines are
 * joined by newlines); comment lines (`:`) and other fields are ignored. Accepts \n, \r\n and \r line ends.
 * `rest` is the unfinished tail to keep for the next chunk.
 */
export function drainSse(buf: string): { data: string[]; rest: string } {
  const cr = buf.endsWith('\r') ? '\r' : ''; // may be the first half of \r\n
  const frames = (cr ? buf.slice(0, -1) : buf).replace(/\r\n?/g, '\n').split('\n\n');
  const rest = frames.pop()! + cr;
  const data: string[] = [];
  for (const f of frames) {
    const lines = f.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(l.startsWith('data: ') ? 6 : 5));
    if (lines.length) data.push(lines.join('\n'));
  }
  return { data, rest };
}

class Gone extends Error {}

/** Reads one SSE stream, handing each frame's parsed JSON to onJson (bad JSON is skipped). Resolves when the stream
 *  ends; throws Gone on a 404 (the stream will never exist again). */
async function readSse(url: string, signal: AbortSignal, onOpen: () => void, onJson: (x: unknown) => void) {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal });
  if (res.status === 404) throw new Gone('404');
  if (!res.ok || !res.body) throw new Error(String(res.status));
  onOpen();
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    const r = drainSse(buf + dec.decode(value, { stream: true }));
    buf = r.rest;
    for (const d of r.data) {
      let x: unknown;
      try { x = JSON.parse(d); } catch { continue; }
      onJson(x);
    }
  }
}

/** Keeps an SSE stream open, reconnecting after a drop until the returned function is called, the server answers 404,
 *  or onJson returns true (a final message). */
function watch(path: string, retryMs: number, onJson: (x: unknown) => boolean | void, onState?: (connected: boolean) => void, onDone?: () => void): () => void {
  let stop = false;
  let ac: AbortController | null = null;
  (async () => {
    while (!stop) {
      ac = new AbortController();
      let done = false;
      try {
        await readSse(`${SERVER_URL}${path}`, ac.signal, () => onState?.(true), (x) => { if (onJson(x)) done = true; });
      } catch (e) {
        if (e instanceof Gone) done = true; /* else dropped: retry below */
      }
      if (stop) return;
      if (done) { if (onDone) onDone(); else onState?.(false); return; }
      onState?.(false);
      await new Promise((r) => setTimeout(r, retryMs));
    }
  })();
  return () => { stop = true; ac?.abort(); };
}

const isInt = (x: unknown): x is number => Number.isInteger(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Shape check for a room view from the server; null when it does not look like one. */
export function parseView(x: unknown): RoomView | null {
  if (!isObj(x)) return null;
  const c = x.config;
  const ints = (a: unknown) => Array.isArray(a) && a.every(isInt);
  const ok = isStr(x.code) && (x.status === 'lobby' || x.status === 'playing' || x.status === 'over') && isInt(x.mySeat)
    && isStr(x.hostId) && isObj(c) && (c.players === 2 || c.players === 3 || c.players === 4)
    && (x.timer === 0 || x.timer === 5 || x.timer === 15)
    && Array.isArray(x.seats) && x.seats.every((s) => isObj(s) && isStr(s.name) && typeof s.bot === 'boolean'
      && typeof s.connected === 'boolean' && typeof s.abandoned === 'boolean')
    && (x.match === null || (isObj(x.match) && isObj(x.match.config)))
    && (x.deadline === null || isNum(x.deadline)) && ints(x.ready) && typeof x.ranked === 'boolean' && ints(x.rematch)
    && (x.deltas === null || (Array.isArray(x.deltas) && x.deltas.every((d) => d === null || isNum(d)))) && isInt(x.games)
    && (x.aborted === undefined || typeof x.aborted === 'boolean');
  return ok ? (x as unknown as RoomView) : null;
}

/** Streams room views; reconnects after a drop until the returned function is called, the room is gone (404),
 *  or the server sends its final view (`aborted: true`, on shutdown). */
/** onClosed fires once when the room is gone for good (404 or an aborted view); without it the stream reports disconnected. */
export function watchRoom(code: string, onView: (v: RoomView) => void, onState: (connected: boolean) => void, onClosed?: () => void): () => void {
  return watch(`/api/rooms/${encodeURIComponent(code)}/events`, 1000, (x) => {
    const v = parseView(x);
    if (v) onView(v);
    return v?.aborted === true;
  }, onState, onClosed);
}

// ---- social: friends, direct messages, public chat, rankings, prizes ----
export interface Person { id: string; name: string }
export interface FriendsList { code: string; friends: (Person & { online: boolean })[]; incoming: Person[]; outgoing: Person[]; blocked: Person[] }
export interface DmMsg { id: number; ts: number; from: string; to: string; text: string }
export interface ChatMsg { id: number; ts: number; from: string; name: string; text: string }
export interface RankRow { id: string; name: string; wins: number; games: number; coins: number }
export interface PrizeInfo { mine: { id: number; period: string; rank: number; shahi: number; gohar: number }[]; announcement: { period: string; winners: { rank: number; name: string }[] }[] }
export type PushEvent =
  | { type: 'friend-request' | 'friend-accepted'; from: Person }
  | { type: 'dm'; msg: DmMsg; fromName: string }
  | { type: 'chat'; msg: ChatMsg }
  | { type: 'chat-hide'; id: number }
  | { type: 'match-found'; code: string }
  | { type: 'invite'; code: string; players: number; from: Person };

export const hasCred = () => loadCred() !== null;
export const getFriends = () => call<FriendsList>('GET', '/api/friends');
export const friendRequest = (code: string) => call('POST', '/api/friends/request', { code });
export const friendAction = (action: 'accept' | 'reject' | 'remove' | 'block' | 'unblock', id: string) => call('POST', `/api/friends/${action}`, { id });
export const getDms = (id: string) => call<{ messages: DmMsg[] }>('GET', `/api/dm/${id}`);
export const sendDm = (id: string, text: string) => call<DmMsg>('POST', `/api/dm/${id}`, { text });
export const getChat = () => call<{ messages: ChatMsg[] }>('GET', '/api/chat');
export const postChat = (text: string) => call<ChatMsg>('POST', '/api/chat', { text });
export const reportChat = (id: number) => call('POST', '/api/chat/report', { id });
export interface LadderRow { id: string; name: string; trophies: number }
export const getRankings = (period: 'week' | 'month' | 'ladder') => call<{ rows: (RankRow & LadderRow)[] }>('GET', `/api/rankings?period=${period}`);
export const getPrizes = () => call<PrizeInfo>('GET', '/api/prizes');
/** Claims a prize; the server's amounts must be non-negative integers or the call fails. */
export async function claimPrizeCall(id: number): Promise<{ shahi: number; gohar: number }> {
  const r = await call<Record<string, unknown>>('POST', '/api/prizes/claim', { id });
  const amount = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;
  if (!amount(r.shahi) || !amount(r.gohar)) throw new Error('bad prize from server');
  return { shahi: r.shahi, gohar: r.gohar };
}

const isPerson = (x: unknown) => isObj(x) && isStr(x.id) && isStr(x.name);
const isMsg = (m: unknown): m is Record<string, unknown> => isObj(m) && isInt(m.id) && isNum(m.ts) && isStr(m.from) && isStr(m.text);

/** Shape check for a push event; null for an unknown type or a malformed payload. */
export function parseEvent(x: unknown): PushEvent | null {
  if (!isObj(x)) return null;
  const t = x.type;
  const ok = t === 'friend-request' || t === 'friend-accepted' ? isPerson(x.from)
    : t === 'dm' ? isMsg(x.msg) && isStr(x.msg.to) && isStr(x.fromName)
    : t === 'chat' ? isMsg(x.msg) && isStr(x.msg.name)
    : t === 'chat-hide' ? isInt(x.id)
    : t === 'match-found' ? isStr(x.code)
    : t === 'invite' ? isStr(x.code) && isInt(x.players) && isPerson(x.from)
    : false;
  return ok ? (x as unknown as PushEvent) : null;
}

/** Push channel for requests, messages and chat; reconnects after a drop until stopped. onState reports the connection. */
export function watchMe(onEvent: (e: PushEvent) => void, onState?: (connected: boolean) => void): () => void {
  return watch('/api/me/events', 1500, (x) => { const e = parseEvent(x); if (e) onEvent(e); }, onState);
}
