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
});
