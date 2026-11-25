import { beforeEach, describe, expect, it, vi } from 'vitest';

const JPEG = 'data:image/jpeg;base64,AAAA';
const PROFILE_KEY = 'chaharbarg.profile.v1';
const PHOTO_KEY = 'chaharbarg.photo.v1';

let data: Map<string, string>;
let failWrites: boolean;

beforeEach(() => {
  data = new Map();
  failWrites = false;
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { if (failWrites) throw new Error('quota'); data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
  });
  vi.resetModules();
});

const fresh = () => import('./store');

describe('profile + photo storage', () => {
  it('name survives a restart', async () => {
    const s = await fresh();
    s.update((q) => ({ ...q, name: 'Sara' }));
    vi.resetModules();
    const s2 = await fresh();
    expect(s2).not.toBe(s);
    expect(s2.getProfile().name).toBe('Sara');
  });

  it('picture survives a restart', async () => {
    const s = await fresh();
    expect(s.setPhoto(JPEG)).toBe(true);
    vi.resetModules();
    const s2 = await fresh();
    expect(s2).not.toBe(s);
    expect(s2.getPhoto()).toBe(JPEG);
  });

  it('picture and avatar are independent', async () => {
    const s = await fresh();
    s.update((q) => ({ ...q }));
    const before = data.get(PROFILE_KEY);
    s.setPhoto(JPEG);
    expect(data.get(PROFILE_KEY)).toBe(before);
    s.setPhoto(null);
    expect(data.get(PROFILE_KEY)).toBe(before);
    s.setPhoto(JPEG);
    s.update((q) => ({ ...q, equipped: { ...q.equipped, deck: 'x' } }));
    expect(s.getPhoto()).toBe(JPEG);
  });

  it('keeps the old picture when storage is full', async () => {
    const s = await fresh();
    s.setPhoto(JPEG);
    failWrites = true;
    expect(s.setPhoto('data:image/jpeg;base64,BBBB')).toBe(false);
    expect(s.getPhoto()).toBe(JPEG);
  });

  it('rejects non-jpeg input and writes nothing', async () => {
    const s = await fresh();
    expect(s.setPhoto('data:text/html;base64,AAAA')).toBe(false);
    expect(data.has(PHOTO_KEY)).toBe(false);
    expect(s.getPhoto()).toBeNull();
  });

  it('ignores a non-jpeg value in storage', async () => {
    data.set(PHOTO_KEY, 'data:image/svg+xml;base64,AAAA');
    const s = await fresh();
    expect(s.getPhoto()).toBeNull();
  });

  it('resetAll clears the picture', async () => {
    const s = await fresh();
    s.setPhoto(JPEG);
    s.resetAll();
    expect(s.getPhoto()).toBeNull();
    expect(data.has(PHOTO_KEY)).toBe(false);
  });
});

describe('solo stage progress', () => {
  it('starts empty and survives a restart', async () => {
    const s = await fresh();
    expect(s.getProfile().stages).toEqual([]);
    s.update((q) => ({ ...q, stages: ['stage-1'] }));
    vi.resetModules();
    expect((await fresh()).getProfile().stages).toEqual(['stage-1']);
  });

  it('drops unknown, duplicate and non-string entries; old saves get []', async () => {
    const s = await fresh();
    const base = JSON.parse(JSON.stringify(s.getProfile()));
    data.set(PROFILE_KEY, JSON.stringify({ ...base, stages: ['stage-2', 'stage-2', 'nope', 7, null] }));
    vi.resetModules();
    expect((await fresh()).getProfile().stages).toEqual(['stage-2']);
    delete base.stages;
    data.set(PROFILE_KEY, JSON.stringify(base));
    vi.resetModules();
    expect((await fresh()).getProfile().stages).toEqual([]);
    data.set(PROFILE_KEY, JSON.stringify({ ...base, stages: 'stage-1' }));
    vi.resetModules();
    expect((await fresh()).getProfile().stages).toEqual([]);
  });
});

describe('stats by player count in old saves', () => {
  it('a save without byPlayers loads with an empty split', async () => {
    const s = await fresh();
    const base = JSON.parse(JSON.stringify(s.getProfile()));
    delete base.stats.byPlayers;
    data.set(PROFILE_KEY, JSON.stringify(base));
    vi.resetModules();
    expect((await fresh()).getProfile().stats.byPlayers).toEqual({});
  });
});

describe('save with no stats object', () => {
  it('loads with zeroed totals', async () => {
    const s = await fresh();
    const base = JSON.parse(JSON.stringify(s.getProfile()));
    delete base.stats;
    data.set(PROFILE_KEY, JSON.stringify(base));
    vi.resetModules();
    expect((await fresh()).getProfile().stats).toMatchObject({ games: 0, wins: 0, byPlayers: {} });
  });
});

describe('saved title', () => {
  it('keeps a known honor id and drops anything else', async () => {
    const s = await fresh();
    const base = JSON.parse(JSON.stringify(s.getProfile()));
    for (const [saved, want] of [['wins-25', 'wins-25'], ['bogus', null], [5, null]] as const) {
      data.set(PROFILE_KEY, JSON.stringify({ ...base, title: saved }));
      vi.resetModules();
      expect((await fresh()).getProfile().title).toBe(want);
    }
  });
});

describe('saved stats cleaning (F-097)', () => {
  it('repairs bad counters, drops unknown groups, handles a non-object', async () => {
    const s = await fresh();
    const base = JSON.parse(JSON.stringify(s.getProfile()));
    const bad = { games: -3, wins: 'x', losses: 2.9, streak: null, byArena: { persepolis: { games: 5, wins: 'a' }, zzz: { games: 1 } }, byPlayers: { 2: { games: 4, wins: 1, surs: 2 }, 9: {} } };
    data.set(PROFILE_KEY, JSON.stringify({ ...base, stats: bad }));
    vi.resetModules();
    const st = (await fresh()).getProfile().stats;
    expect(st).toMatchObject({ games: 0, wins: 0, losses: 2, streak: 0 });
    expect(st.byArena).toEqual({ persepolis: { games: 5, wins: 0 } });
    expect(st.byPlayers).toEqual({ 2: { games: 4, wins: 1, surs: 2 } });
    data.set(PROFILE_KEY, JSON.stringify({ ...base, stats: [1] }));
    vi.resetModules();
    expect((await fresh()).getProfile().stats.games).toBe(0);
  });
});

describe('saved avatar (F-007)', () => {
  it('keeps a valid avatar and repairs bad values', async () => {
    const s = await fresh();
    const base = JSON.parse(JSON.stringify(s.getProfile()));
    expect(base.avatar).toEqual({ hue: 45, glyph: '' });
    for (const [saved, want] of [
      [{ hue: 200, glyph: '🦁' }, { hue: 200, glyph: '🦁' }],
      [{ hue: 999.4, glyph: '<script>' }, { hue: 359, glyph: '' }],
      [{ hue: 'x' }, { hue: 45, glyph: '' }],
      [null, { hue: 45, glyph: '' }],
    ] as const) {
      data.set(PROFILE_KEY, JSON.stringify({ ...base, avatar: saved }));
      vi.resetModules();
      expect((await fresh()).getProfile().avatar).toEqual(want);
    }
  });
});

describe('profile loader is field by field', () => {
  const saved = async () => JSON.parse(JSON.stringify((await fresh()).getProfile()));
  const reload = async (v: unknown) => {
    data.set(PROFILE_KEY, typeof v === 'string' ? v : JSON.stringify(v));
    vi.resetModules();
    return (await fresh()).getProfile();
  };

  it('corrupt JSON: starts fresh and keeps a backup copy', async () => {
    const p = await reload('{"name":"Sara",');
    expect(p.name).toBe('');
    expect(p.shahi).toBe(500);
    expect(data.get('chaharbarg.profile.v1.bak')).toBe('{"name":"Sara",');
  });

  it('an unknown version is backed up, not silently overwritten', async () => {
    const base = await saved();
    await reload({ ...base, v: 99 });
    expect(JSON.parse(data.get('chaharbarg.profile.v1.bak')!).v).toBe(99);
  });

  it('missing ledger zeroes balances only', async () => {
    const base = await saved();
    delete base.ledger;
    const p = await reload({ ...base, name: 'Sara', shahi: 99999, trophies: 300, stages: ['stage-1'] });
    expect(p).toMatchObject({ name: 'Sara', shahi: 0, gohar: 0, trophies: 300, stages: ['stage-1'] });
    expect(p.ledger.length).toBe(1);
  });

  it('daily: null and other bad fields do not cost the rest', async () => {
    const base = await saved();
    const p = await reload({ ...base, name: 'Sara', daily: null, ads: 'x', login: [], owned: 5, equipped: { deck: 'nope' }, achievements: [1, 'first-win', 'bogus'] });
    expect(p.name).toBe('Sara');
    expect(p.daily).toEqual({ date: '', progress: {}, claimed: [] });
    expect(p.ads).toEqual({ day: '', watched: 0, lastAt: 0 });
    expect(p.login).toEqual({ last: '', streak: 0 });
    expect(p.owned.length).toBeGreaterThan(0);
    expect(p.equipped.deck).toBe('deck-classic');
    expect(p.achievements).toEqual(['first-win']);
  });

  it('a malformed ledger entry truncates the ledger there (rolls back, no crash)', async () => {
    const s = await fresh();
    s.update((q) => ({ ...q, name: 'Sara' }));
    const base = JSON.parse(data.get(PROFILE_KEY)!);
    const p = await reload({ ...base, ledger: [...base.ledger, null] });
    expect(p).toMatchObject({ name: 'Sara', shahi: 500 });
  });

  it('a future reliefAt is clamped; lastSeen never below the ledger head', async () => {
    const base = await saved();
    const p = await reload({ ...base, reliefAt: Date.now() + 1e12, lastSeen: 0 });
    expect(p.reliefAt).toBeLessThanOrEqual(Date.now());
    expect(p.lastSeen).toBe(base.ledger.at(-1).t);
  });

  it('legacy settings target 100 loads as long', async () => {
    const base = await saved();
    expect((await reload({ ...base, settings: { ...base.settings, target: 100 } })).settings.target).toBe('long');
    expect((await reload({ ...base, settings: { ...base.settings, target: 62 } })).settings.target).toBe('short');
  });
});

describe('saved match', () => {
  const MATCH_KEY = 'chaharbarg.match.v1';
  const ctx = async () => {
    const { buildCtx } = await import('./match');
    const { arenaById } = await import('../data/arenas');
    return buildCtx((await fresh()).getProfile(), arenaById('si-o-se-pol'), 2, 'bots');
  };
  it('a genuine saved match loads', async () => {
    const c = await ctx();
    data.set(MATCH_KEY, JSON.stringify(c));
    vi.resetModules();
    expect((await fresh()).loadMatch()?.fee).toBe(50);
  });
  it('a tampered fee, unknown arena or paid pass-and-play is rejected', async () => {
    const c = await ctx();
    for (const bad of [{ fee: 5000 }, { fee: 50.5 }, { fee: '50' }, { arenaId: 'nope' }, { paid: false }, { mode: 'pnp' }, { paid: 'yes' }]) {
      data.set(MATCH_KEY, JSON.stringify({ ...c, ...bad }));
      vi.resetModules();
      expect((await fresh()).loadMatch()).toBeNull();
    }
  });
});

describe('resetAll', () => {
  it('removes every chaharbarg.* key and nothing else', async () => {
    for (const k of ['chaharbarg.online.v1', 'chaharbarg.online.v1:bob', 'chaharbarg.server.v1', 'chaharbarg.mockstore', 'chaharbarg.prizes.seen.v1', 'chaharbarg.match.v1', 'chaharbarg.profile.v1.bak', 'other.app']) data.set(k, 'x');
    const s = await fresh();
    s.setPhoto(JPEG);
    s.resetAll();
    expect([...data.keys()].sort()).toEqual([PROFILE_KEY, 'other.app']);
  });
});
