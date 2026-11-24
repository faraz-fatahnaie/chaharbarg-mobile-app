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
}

/** Server address: VITE_SERVER_URL, else port 8787 on the host serving the app (works from a phone on the same Wi-Fi). */
export const SERVER_URL: string =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? `${location.protocol}//${location.hostname}:8787`;

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
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `server error ${res.status}`);
  return json;
}

/** Signs in as a guest (creating the account on first use); returns the player id. */
export async function signIn(name: string): Promise<string> {
  const c = loadCred();
  const r = await call<{ id: string; token: string }>('POST', '/api/guest', { name, id: c?.id, token: c ? c.token.split('.')[1] : undefined });
  token = r.token;
  try { localStorage.setItem(CRED_KEY, JSON.stringify({ id: r.id, token: r.token })); } catch { /* private mode */ }
  return r.id;
}

export const createRoom = (players: number, target: number, timer: number) => call<{ code: string }>('POST', '/api/rooms', { players, target, timer });
export const joinRoom = (code: string) => call('POST', `/api/rooms/${code}/join`, {});
export const startRoom = (code: string, fillBots: boolean) => call('POST', `/api/rooms/${code}/start`, { fillBots });
export const sendMove = (code: string, cardId: string, captureIds: string[]) => call('POST', `/api/rooms/${code}/move`, { cardId, captureIds });
export const sendReady = (code: string) => call('POST', `/api/rooms/${code}/ready`, {});

/** Streams room views; reconnects after a drop until the returned function is called or the match is over. */
export function watchRoom(code: string, onView: (v: RoomView) => void, onState: (connected: boolean) => void): () => void {
  let stop = false;
  let ac: AbortController | null = null;
  (async () => {
    while (!stop) {
      ac = new AbortController();
      try {
        const res = await fetch(`${SERVER_URL}/api/rooms/${code}/events`, { headers: { authorization: `Bearer ${token}` }, signal: ac.signal });
        if (!res.ok || !res.body) throw new Error(String(res.status));
        onState(true);
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i);
            buf = buf.slice(i + 2);
            if (chunk.startsWith('data: ')) onView(JSON.parse(chunk.slice(6)) as RoomView);
          }
        }
      } catch {
        /* dropped: retry below */
      }
      if (stop) return;
      onState(false);
      await new Promise((r) => setTimeout(r, 1000));
    }
  })();
  return () => { stop = true; ac?.abort(); };
}
