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
