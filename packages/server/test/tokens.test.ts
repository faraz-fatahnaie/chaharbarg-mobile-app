import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authenticate, guestLogin, openDb, revokeToken, TOKEN_TTL_MS } from '../src/db';
import { createApp } from '../src/server';

const DAY = 24 * 3600 * 1000;
const bearer = (a: { id: string; token: string }) => `Bearer ${a.id}.${a.token}`;

describe('token lifetime (F-100)', () => {
  it('is 90 days', () => expect(TOKEN_TTL_MS).toBe(90 * DAY));

  it('a token unused for 90 days stops working', () => {
    const db = openDb(); const t0 = 1_000_000;
    const a = guestLogin(db, 'Sara', undefined, undefined, () => true, t0);
    expect(authenticate(db, bearer(a), t0 + 90 * DAY)).not.toBeNull();
    const db2 = openDb(); const b = guestLogin(db2, 'Ali', undefined, undefined, () => true, t0);
    expect(authenticate(db2, bearer(b), t0 + 90 * DAY + 1)).toBeNull();
  });

  it('every use renews it (sliding)', () => {
    const db = openDb(); const t0 = 1_000_000;
    const a = guestLogin(db, 'Sara', undefined, undefined, () => true, t0);
    expect(authenticate(db, bearer(a), t0 + 80 * DAY)).not.toBeNull();
    expect(authenticate(db, bearer(a), t0 + 160 * DAY)).not.toBeNull();
    expect(authenticate(db, bearer(a), t0 + 251 * DAY)).toBeNull();
  });

  it('signing in with a live token renews it; with an expired one makes a new account', () => {
    const db = openDb(); const t0 = 1_000_000;
    const a = guestLogin(db, 'Sara', undefined, undefined, () => true, t0);
    expect(guestLogin(db, 'Sara', a.id, a.token, () => true, t0 + 60 * DAY).id).toBe(a.id);
    expect(authenticate(db, bearer(a), t0 + 140 * DAY)).not.toBeNull();
    expect(guestLogin(db, 'Sara', a.id, a.token, () => true, t0 + 231 * DAY).id).not.toBe(a.id);
  });

  it('a revoked token never works again', () => {
    const db = openDb();
    const a = guestLogin(db, 'Sara');
    revokeToken(db, a.id);
    expect(authenticate(db, bearer(a))).toBeNull();
    expect(guestLogin(db, 'Sara', a.id, a.token).id).not.toBe(a.id);
  });

  it('accounts from before the column existed are treated as just used, not expired', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'cb-tok-')), 'db.sqlite');
    const db = openDb(path);
    const a = guestLogin(db, 'Sara', undefined, undefined, () => true, 1);
    db.prepare('UPDATE players SET token_seen = 0').run(); // what the migration's DEFAULT gives old rows
    db.close();
    expect(authenticate(openDb(path), bearer(a))).not.toBeNull();
  });
});

let apps: ReturnType<typeof createApp>[] = [];
afterEach(() => { apps.forEach((a) => a.close()); apps = []; });

describe('POST /api/logout', () => {
  it('revokes the caller token', async () => {
    const app = createApp({ queueTickMs: 0 }); apps.push(app);
    await new Promise<void>((r) => app.server.listen(0, r));
    const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
    const g = await (await fetch(base + '/api/guest', { method: 'POST', body: JSON.stringify({ name: 'Sara' }) })).json() as { token: string };
    const auth = { authorization: `Bearer ${g.token}` };
    expect((await fetch(base + '/api/me', { headers: auth })).status).toBe(200);
    expect((await fetch(base + '/api/logout', { method: 'POST', headers: auth })).status).toBe(200);
    expect((await fetch(base + '/api/me', { headers: auth })).status).toBe(401);
  });
});
