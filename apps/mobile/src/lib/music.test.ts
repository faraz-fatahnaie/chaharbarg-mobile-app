import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARENA_MUSIC, FALLBACK_ARENA, MODE_CENTS, MODE_RATIOS, RHYTHMS, arenaMusic, createPump, degreeHz, genCycle, genPhrase } from './music';

const seeded = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);

describe('scale tables', () => {
  it('modes are 7 strictly increasing cents below an octave', () => {
    for (const c of Object.values(MODE_CENTS)) {
      expect(c).toHaveLength(7);
      c.forEach((x, i) => { expect(x).toBeLessThan(1200); if (i) expect(x).toBeGreaterThan(c[i - 1]); });
    }
  });
  it('degreeHz wraps octaves and matches ratios', () => {
    const r = MODE_RATIOS.mahur;
    expect(degreeHz(200, r, 0)).toBeCloseTo(200);
    expect(degreeHz(200, r, 7)).toBeCloseTo(400);
    expect(degreeHz(200, r, 4)).toBeCloseTo(200 * 1.4983, 1);
  });
  it('every arena resolves, unknown id falls back by kind', () => {
    expect(Object.keys(ARENA_MUSIC)).toHaveLength(10);
    expect(arenaMusic('water', 'nope')).toBe(ARENA_MUSIC[FALLBACK_ARENA.water]);
    expect(arenaMusic('wind', 'yazd')).toBe(ARENA_MUSIC.yazd);
  });
});

describe('phrase generator', () => {
  it('A ends on degree 3, B on tonic, degrees in range, durations fill the phrase', () => {
    for (const L of [12, 16]) for (let s = 1; s < 40; s++) {
      const rng = seeded(s), rest = (s % 7) / 10;
      const A = genPhrase(rng, 'A', L, rest), B = genPhrase(rng, 'B', L, rest, A.moves.slice(0, 3));
      for (const P of [A, B]) {
        expect(P.notes.reduce((a, n) => a + n.dur, 0)).toBe(2 * L);
        P.notes.forEach((n) => { if (n.deg !== null) { expect(n.deg).toBeGreaterThanOrEqual(0); expect(n.deg).toBeLessThanOrEqual(9); } });
      }
      expect(A.notes.at(-1)?.deg).toBe(3);
      expect(B.notes.at(-1)?.deg).toBe(0);
    }
  });
  it('cycle is 5 bars, melody silent in the last bar', () => {
    const L = RHYTHMS.A44.length, mel = genCycle(seeded(3), 0.3, L);
    expect(mel).toHaveLength(5 * L);
    expect(mel.slice(4 * L).every((n) => n === null)).toBe(true);
    expect(mel[0]?.deg).not.toBeNull();
  });
});

describe('scheduler', () => {
  afterEach(() => vi.useRealTimers());
  it('schedules a lookahead window, keeps step spacing, stops cleanly, skips after a stall', () => {
    vi.useFakeTimers();
    let now = 0;
    const got: number[] = [];
    const p = createPump(() => now, () => 0.1, (_s, t) => got.push(t));
    p.start();
    expect(got.map((t) => +t.toFixed(2))).toEqual([0.1, 0.2]); // < now + 0.25 only
    expect(vi.getTimerCount()).toBe(1);
    now = 0.2; vi.advanceTimersByTime(60);
    expect(got.at(-1)).toBeCloseTo(0.4);
    now = 10; vi.advanceTimersByTime(60); // webview stalled: no burst of catch-up steps
    const after = got.filter((t) => t > 5);
    expect(after.length).toBeLessThanOrEqual(3);
    expect(after[0]).toBeGreaterThanOrEqual(10);
    p.stop();
    expect(vi.getTimerCount()).toBe(0);
    const n = got.length; now = 20; vi.advanceTimersByTime(500);
    expect(got.length).toBe(n);
  });
});

describe('sound engine against the minimal fake ctx', () => {
  it('every sfx kind and every arena start/stop without throwing, one timer while playing', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const chain = (): Record<string, unknown> => {
      const p = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 0 });
      const o: Record<string, unknown> = { frequency: p(), gain: p(), connect: vi.fn(() => o), start: vi.fn(), stop: vi.fn() };
      return o;
    };
    const ctx = { state: 'running', currentTime: 0, sampleRate: 8, destination: {}, createOscillator: chain, createGain: chain,
      createBiquadFilter: chain, createBuffer: () => ({ getChannelData: () => new Float32Array(16) }), createBufferSource: chain };
    (globalThis as unknown as { window: unknown }).window = { AudioContext: vi.fn(() => ctx) };
    const s = await import('./sound');
    for (const k of ['card', 'capture', 'sur', 'win', 'lose', 'click', 'coin', 'deal', 'select', 'score', 'turn', 'timer', 'sarbaz', 'sticker'] as const)
      for (const n of [0, 7]) expect(() => s.sfx(k, n)).not.toThrow();
    for (const id of [...Object.keys(ARENA_MUSIC), 'unknown'])
      for (const kind of ['wind', 'water', 'bazaar', 'garden', 'desert'] as const) {
        expect(() => s.startAmbient(kind, id)).not.toThrow();
        expect(vi.getTimerCount()).toBe(1);
      }
    s.stopAmbient();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
