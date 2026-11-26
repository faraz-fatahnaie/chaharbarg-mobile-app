import { beforeEach, describe, expect, it, vi } from 'vitest';

function setup() {
  const chain = (): Record<string, unknown> => {
    const o: Record<string, unknown> = { frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 0 },
      connect: vi.fn(() => o), start: vi.fn(), stop: vi.fn() };
    return o;
  };
  const fakeCtx = {
    state: 'running', currentTime: 0, sampleRate: 8, destination: {},
    createOscillator: vi.fn(chain), createGain: vi.fn(chain), createBiquadFilter: vi.fn(chain),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(16) })),
    createBufferSource: vi.fn(chain),
  };
  (globalThis as unknown as { window: unknown }).window = { AudioContext: vi.fn(() => fakeCtx) };
  return fakeCtx;
}

describe('sound toggles', () => {
  beforeEach(() => { vi.resetModules(); });

  it('effects off: sfx creates no oscillator', async () => {
    const ctx = setup();
    const s = await import('./sound');
    s.setEffectsEnabled(false);
    s.sfx('click');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('music off: no ambient source, effects still play', async () => {
    const ctx = setup();
    const s = await import('./sound');
    s.setMusicEnabled(false);
    s.startAmbient('wind');
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    s.sfx('click');
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it('effects off, music on: ambient still starts', async () => {
    const ctx = setup();
    const s = await import('./sound');
    s.setEffectsEnabled(false);
    s.startAmbient('wind');
    expect(ctx.createBufferSource).toHaveBeenCalled();
  });

  it('music back on restarts the bed the screen asked for; a repeat "on" or a stopped bed does not', async () => {
    const ctx = setup();
    const s = await import('./sound');
    s.setMusicEnabled(false);
    s.startAmbient('wind');
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    s.setMusicEnabled(true);
    const n = ctx.createBufferSource.mock.calls.length;
    expect(n).toBeGreaterThan(0);
    s.stopAmbient(); // stop the pump so it schedules nothing more
    s.startAmbient('wind');
    const m = ctx.createBufferSource.mock.calls.length;
    s.setMusicEnabled(true); // already on: no second bed
    expect(ctx.createBufferSource.mock.calls.length).toBe(m);
    s.stopAmbient();
    s.setMusicEnabled(false);
    s.setMusicEnabled(true); // the screen stopped its bed: nothing to restart
    expect(ctx.createBufferSource.mock.calls.length).toBe(m);
  });

  it('a game started with music off plays its arena bed once music is turned on mid-game', async () => {
    const ctx = setup();
    const s = await import('./sound');
    s.setMusicEnabled(false);
    s.startAmbient('wind', 'persepolis'); // what Game does at start, whatever the setting
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    s.setMusicEnabled(true);
    expect(ctx.createBufferSource).toHaveBeenCalled();
    s.stopAmbient();
  });

  it('resumes an iOS "interrupted" context', async () => {
    const ctx = setup() as ReturnType<typeof setup> & { resume: () => Promise<void> };
    ctx.state = 'interrupted';
    ctx.resume = vi.fn(async () => {});
    const s = await import('./sound');
    s.sfx('click');
    expect(ctx.resume).toHaveBeenCalled();
  });
});
