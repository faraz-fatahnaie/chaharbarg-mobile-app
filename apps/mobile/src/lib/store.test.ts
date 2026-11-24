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
