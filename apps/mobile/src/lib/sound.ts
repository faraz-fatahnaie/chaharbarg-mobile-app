// Procedural sound (design/audio-design.md): no audio files, works offline. Persian-flavoured
// instruments (santur, tar, daf, ney) synthesised in WebAudio; generative modal music bed in music.ts.
// Every node beyond the five the unit-test fake provides is feature-detected.
import { MODE_RATIOS, RHYTHMS, arenaMusic, createPump, degreeHz, genCycle, type Kind, type Note } from './music';

let ctx: AudioContext | null = null;
let musicOn = true;
let effectsOn = true;
let ambient: { stop: () => void } | null = null;
/** the bed the screen asked for; kept while music is toggled off so turning it back on restarts it */
let bed: { kind: Kind; arenaId?: string } | null = null;

export const setMusicEnabled = (on: boolean) => {
  const was = musicOn;
  musicOn = on;
  if (!on) haltAmbient();
  else if (!was && bed) startAmbient(bed.kind, bed.arenaId);
};
export const setEffectsEnabled = (on: boolean) => {
  effectsOn = on;
};

function ac() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    // iOS reports 'interrupted' after a call or Siri; it is not in the DOM typings
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const set = (p: { value: number } | undefined, v: number) => { if (p) p.value = v; };

// ---- master graph: sfx + music + reverb return -> master -> compressor -> destination ----
type G = { c: AudioContext; sfx: GainNode; music: GainNode; send?: GainNode; white: AudioBuffer; brown: AudioBuffer };
let graphOf: G | null = null;
let mbus: AudioNode | undefined; // current music session's fade gain (music voices route through it)

function graph(c: AudioContext): G {
  if (graphOf?.c === c) return graphOf;
  const gn = (v: number, to?: AudioNode) => { const g = c.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  let out: AudioNode = c.destination;
  if (typeof c.createDynamicsCompressor === 'function') {
    const k = c.createDynamicsCompressor();
    set(k.threshold, -14); set(k.knee, 12); set(k.ratio, 4); set(k.attack, 0.004); set(k.release, 0.18);
    k.connect(out);
    out = k;
  }
  const master = gn(0.9, out);
  let send: GainNode | undefined;
  if (typeof c.createDelay === 'function') {
    const ret = gn(0.25, master);
    send = gn(1);
    for (const t of [0.037, 0.053, 0.079]) {
      const d = c.createDelay(); set(d.delayTime, t);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; set(lp.frequency, 2800);
      const fb = gn(0.42, d);
      send.connect(d); d.connect(lp); lp.connect(fb); lp.connect(ret);
    }
  }
  const rate = c.sampleRate;
  const fill = (sec: number, brown: boolean) => {
    const b = c.createBuffer(1, Math.max(1, Math.floor(rate * sec)), rate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = brown ? last * 3.5 : w;
    }
    return b;
  };
  graphOf = { c, sfx: gn(0.8, master), music: gn(0.5, master), send, white: fill(1, false), brown: fill(2, true) };
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => void (document.hidden ? c.suspend?.() : c.resume?.()));
  }
  return graphOf;
}
const gr = () => { const c = ac(); return c ? graph(c) : null; };

// ---- voices ----
// m: routed to the music bus; p: priority 0..3 (>=1 is never dropped under the normal cap); s: reverb send amount.
type V = { m?: boolean; p?: number; s?: number };
type Flt = [BiquadFilterType, number, number?, number?, number?]; // type, freq, Q, freq end, glide seconds
type ToneO = V & { type?: OscillatorType; f: number; f2?: number; gl?: number; t: number; A?: number; D: number; R?: number; peak: number; flt?: Flt };
const live = { m: 0, s: 0 };

function room(v: V) {
  const tot = live.m + live.s;
  if ((v.p ?? 0) >= 1) return tot < 36;
  return v.m ? live.m < 10 && tot < 24 : live.s < 14 && tot < 24;
}

/** Attack A (linear) then exponential decay D; with R: hold 80% until D, then release over R. */
function env(p: AudioParam, t: number, A: number, D: number, peak: number, R = 0) {
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + A);
  if (R) {
    p.linearRampToValueAtTime(peak * 0.8, t + A + 0.05);
    p.setValueAtTime(peak * 0.8, t + D);
    p.exponentialRampToValueAtTime(0.0001, t + D + R);
  } else p.exponentialRampToValueAtTime(0.0001, t + A + D);
}

function voice(G: G, src: AudioScheduledSourceNode, o: ToneO, off?: number) {
  const { c } = G, t = o.t, A = o.A ?? 0.001;
  const end = o.R ? t + o.D + o.R : t + A + o.D;
  const g = c.createGain();
  env(g.gain, t, A, o.D, o.peak, o.R);
  const nodes: AudioNode[] = [src, g];
  if (o.flt) {
    const f = c.createBiquadFilter();
    f.type = o.flt[0];
    f.frequency.setValueAtTime(o.flt[1], t);
    set(f.Q, o.flt[2] ?? 1);
    if (o.flt[3]) f.frequency.exponentialRampToValueAtTime(o.flt[3], t + (o.flt[4] ?? 0.18));
    src.connect(f); f.connect(g); nodes.push(f);
  } else src.connect(g);
  g.connect(o.m ? mbus ?? G.music : G.sfx);
  if (o.s && G.send) { const sg = c.createGain(); sg.gain.value = o.s; g.connect(sg); sg.connect(G.send); nodes.push(sg); }
  const b = o.m ? 'm' : 's';
  live[b]++;
  src.onended = () => { live[b]--; nodes.forEach((n) => { try { n.disconnect(); } catch { /* fake node */ } }); };
  (src as unknown as { start(t: number, off?: number): void }).start(t, off);
  src.stop(end + 0.05);
}

function tone(o: ToneO) {
  const G = gr();
  if (!G || !room(o)) return;
  const osc = G.c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f, o.t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, o.t + (o.gl ?? 50) / 1000);
  voice(G, osc, o);
  return osc;
}

function noise(o: Omit<ToneO, 'f'> & { flt: Flt }) {
  const G = gr();
  if (!G || !room(o)) return;
  const src = G.c.createBufferSource();
  src.buffer = G.white;
  voice(G, src, { ...o, f: 0 }, Math.random() * 0.8);
}

// ---- instruments ----
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

function santur(f: number, t: number, v: number, V: V = {}, dMax = 1.1) {
  const D = Math.min(dMax, clamp(0.9 * (261 / f) ** 0.3, 0.35, 1.1));
  const o = { s: 0.35, ...V };
  const flt: Flt = ['lowpass', Math.min(f * 8, 6000), 0.7];
  tone({ ...o, type: 'triangle', f, t, A: 0.002, D, peak: 0.16 * v, flt });
  tone({ ...o, f: f * 1.0035, t, A: 0.002, D, peak: 0.08 * v, flt });
  tone({ ...o, f: f * 2.76, t, A: 0.001, D: 0.06, peak: 0.04 * v });
}

function tar(f: number, t: number, v: number, V: V = {}, D = 0.45) {
  const o = { s: 0.25, ...V };
  const flt: Flt = ['lowpass', 3200, 3, 700, 0.18];
  tone({ ...o, type: 'sawtooth', f, t, A: 0.003, D, peak: 0.05 * v, flt });
  tone({ ...o, type: 'sawtooth', f: f * 1.006, t, A: 0.003, D, peak: 0.05 * v, flt });
}

function ney(f: number, t: number, dur: number, v: number, V: V = {}, vib = 0.006) {
  const o = { s: 0.45, ...V };
  const main = tone({ ...o, f: f * 0.97, f2: f, gl: 60, t, A: 0.09, D: dur, R: 0.16, peak: 0.09 * v });
  tone({ ...o, type: 'triangle', f: f * 2, t, A: 0.09, D: dur, R: 0.16, peak: 0.09 * v * 0.15 });
  noise({ ...o, t, A: 0.09, D: dur, R: 0.16, peak: 0.09 * v * 0.35, flt: ['bandpass', f * 2, 6] });
  const G = gr();
  if (main && G && typeof G.c.createOscillator === 'function') { // vibrato fades in after 120 ms
    const lfo = G.c.createOscillator(), lg = G.c.createGain();
    lfo.frequency.value = 5.2;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * vib, t + 0.35);
    lfo.connect(lg); lg.connect(main.frequency);
    lfo.start(t); lfo.stop(t + dur + 0.25);
  }
}

/** kind 1 dum, 2 tak, 3 ghost, 4 jingle ring. */
function daf(k: number, t: number, v: number, V: V) {
  if (k === 1) {
    tone({ ...V, f: 150, f2: 70, gl: 90, t, D: 0.16, peak: 0.22 * v });
    noise({ ...V, t, D: 0.02, peak: 0.08 * v, flt: ['lowpass', 400] });
  } else if (k === 4) {
    for (let i = 0; i < 3; i++) noise({ ...V, t: t + i * 0.014, D: 0.012, peak: 0.04 * v, flt: ['bandpass', 7000, 8] });
  } else {
    noise({ ...V, t, D: 0.045, peak: (k === 2 ? 0.14 : 0.05) * v, flt: ['bandpass', k === 2 ? 2400 : 3000, 1.2] });
  }
}

const bell = (f: number, t: number, D: number, peak: number, V: V = {}) => {
  tone({ ...V, f, t, D, peak });
  tone({ ...V, f: f * 2.76, t, D: D * 0.5, peak: peak * 0.25 });
};

const SHIMMER = [1760, 2093, 2349, 2793, 3136, 3520];
function shimmer(t: number, n: number, gap: number, peak: number, V: V) {
  for (let i = 0; i < n; i++) tone({ ...V, f: SHIMMER[Math.floor(Math.random() * SHIMMER.length)], t: t + i * gap, D: 0.12, peak, s: 0.5 });
}

const STRUM = [293.66, 369.99, 440, 587.33, 739.99];
const strum = (t: number, V: V) => STRUM.forEach((f, i) => santur(f, t + i * 0.035, 0.8 + 0.05 * i, V));

// ---- ducking ----
let duckUntil = 0, duckLvl = 1;
function duck(G: G, t: number, lvl: number, att: number, hold: number, rel: number) {
  if (t < duckUntil && lvl > duckLvl) return; // never shorten a deeper active duck
  duckUntil = t + att + hold + rel; duckLvl = lvl;
  const p = G.music.gain;
  p.cancelScheduledValues?.(t);
  p.setValueAtTime(p.value, t);
  p.linearRampToValueAtTime(lvl * 0.5, t + att);
  p.setValueAtTime(lvl * 0.5, t + att + hold);
  p.linearRampToValueAtTime(0.5, duckUntil);
}

// ---- sfx ----
export type Sfx = 'card' | 'capture' | 'sur' | 'win' | 'lose' | 'click' | 'coin' | 'deal' | 'select' | 'score' | 'turn' | 'timer' | 'sarbaz' | 'sticker';

const SCORE_R = [1, 1.1225, 1.2599, 1.4983, 1.6818];
const DUCK: Partial<Record<Sfx, [number, number, number, number]>> = {
  capture: [0.7, 0.01, 0.12, 0.3], turn: [0.7, 0.01, 0.12, 0.3], coin: [0.7, 0.01, 0.12, 0.3], sticker: [0.7, 0.01, 0.12, 0.3],
  sur: [0.35, 0.01, 0.6, 0.5], sarbaz: [0.35, 0.01, 0.6, 0.5], win: [0.2, 0.03, 2.2, 0.9], lose: [0.2, 0.03, 2.2, 0.9],
};

/** `n`: score index (0-based) for 'score'; 1 = last-seconds urgency for 'timer'. */
export function sfx(kind: Sfx, n = 0) {
  if (!effectsOn) return;
  const G = gr();
  if (!G) return;
  const t = G.c.currentTime + 0.005;
  const d = DUCK[kind];
  if (d) duck(G, t, ...d);
  const p1 = { p: 1 }, p2 = { p: 2 }, p3 = { p: 3 };
  switch (kind) {
    case 'click': return void tone({ type: 'triangle', f: 880, f2: 660, gl: 30, t, D: 0.05, peak: 0.06 });
    case 'select':
      tone({ f: 1320, t, D: 0.045, peak: 0.06 });
      return void tone({ type: 'triangle', f: 1980, t, D: 0.045, peak: 0.024 });
    case 'deal':
      noise({ t, A: 0.005, D: 0.09, peak: 0.1, flt: ['bandpass', 2200, 1, 1200, 0.09] });
      return void tone({ type: 'triangle', f: 300, f2: 200, gl: 60, t, A: 0.002, D: 0.07, peak: 0.04 });
    case 'card':
      tone({ f: 180, f2: 70, gl: 90, t, D: 0.11, peak: 0.22 });
      noise({ t, D: 0.035, peak: 0.1, flt: ['lowpass', 900] });
      return void tone({ type: 'triangle', f: 520, f2: 300, gl: 50, t, D: 0.06, peak: 0.04 });
    case 'capture':
      tone({ ...p1, s: 0.2, type: 'sawtooth', f: 330, f2: 990, gl: 260, t, A: 0.01, D: 0.26, R: 0.04, peak: 0.1, flt: ['lowpass', 1200, 4, 4200, 0.26] });
      noise({ ...p1, t, A: 0.02, D: 0.25, peak: 0.04, flt: ['highpass', 3000, 1, 7000, 0.25] });
      santur(660, t + 0.22, 0.9, p1);
      return santur(990, t + 0.27, 0.9, p1);
    case 'score': {
      const i = Math.min(n, 14), f = 523.25 * SCORE_R[i % 5] * 2 ** Math.floor(i / 5);
      tone({ f: f * 0.92, f2: f, gl: 12, t, D: 0.09, peak: 0.09 });
      tone({ f: f * 2, t, D: 0.04, peak: 0.027 });
      return santur(f, t, 0.5, {}, 0.22);
    }
    case 'turn':
      bell(880, t, 0.5, 0.06, { ...p1, s: 0.35 });
      return bell(1318.5, t + 0.11, 0.5, 0.06, { ...p1, s: 0.35 });
    case 'timer':
      if (n >= 1) {
        tone({ type: 'triangle', f: 1400, f2: 1250, gl: 20, t, D: 0.045, peak: 0.11 });
        return void tone({ f: 700, t, D: 0.06, peak: 0.05 });
      }
      return void tone({ type: 'triangle', f: 1000, f2: 900, gl: 20, t, D: 0.035, peak: 0.08 });
    case 'coin':
      bell(1568, t, 0.26, 0.06, { ...p1, s: 0.25 });
      bell(2093, t + 0.065, 0.3, 0.06, { ...p1, s: 0.25 });
      return void noise({ ...p1, s: 0.25, t, D: 0.012, peak: 0.02, flt: ['highpass', 8000] });
    case 'sticker':
      tone({ ...p1, f: 300, f2: 900, gl: 70, t, A: 0.002, D: 0.1, peak: 0.1 });
      tone({ ...p1, f: 1400, t: t + 0.05, D: 0.12, peak: 0.04 });
      return void noise({ ...p1, t, D: 0.015, peak: 0.03, flt: ['highpass', 4000] });
    case 'sur':
      strum(t, p2);
      for (const f of [293.66, 440 * 1.004]) tone({ ...p2, type: 'sawtooth', f, t, A: 0.03, D: 0.9, peak: 0.03, flt: ['lowpass', 1800] });
      daf(1, t, 1, p2); daf(2, t + 0.12, 1, p2);
      return shimmer(t + 0.15, 6, 0.055, 0.03, p2);
    case 'sarbaz':
      [0.5, 0.7, 0.85, 1].forEach((v, i) => daf(2, t + i * 0.05, v, p2));
      daf(1, t + 0.2, 1, p2);
      [293.66, 440, 587.33].forEach((f) => tar(f, t + 0.2, 1, p2, 0.7));
      return shimmer(t + 0.3, 3, 0.055, 0.03, p2);
    case 'win':
      daf(1, t, 1, p3); daf(2, t + 0.11, 1, p3); daf(2, t + 0.22, 1, p3);
      [293.66, 369.99, 440, 587.33].forEach((f, i) => tar(f, t + i * 0.11, 1, p3, 0.5));
      strum(t + 0.45, p3);
      ney(587.33, t + 0.45, 0.9, 0.75, p3);
      daf(1, t + 0.45, 1, p3);
      return shimmer(t + 0.5, 8, 0.055, 0.03, p3);
    case 'lose': {
      let at = t;
      for (const [f, dur] of [[440, 0.4], [392, 0.3], [349.2, 0.3], [293.66, 0.8]]) { ney(f, at, dur, 0.9, p3, 0.01); at += dur; }
      tone({ ...p3, f: 73.42, t, A: 0.2, D: 1.5, peak: 0.05 });
      return santur(146.83, t + 1.5, 0.6, p3);
    }
  }
}

// ---- music bed ----
const TEX: Record<Kind, { ft: BiquadFilterType; f: number; Q: number; hz: number; gain: number; evt?: [number, number] }> = {
  wind: { ft: 'lowpass', f: 380, Q: 0.7, hz: 0.12, gain: 0.014 },
  water: { ft: 'bandpass', f: 1400, Q: 0.9, hz: 0.35, gain: 0.012, evt: [1.5, 4] },
  bazaar: { ft: 'bandpass', f: 700, Q: 0.5, hz: 0.8, gain: 0.012, evt: [3, 8] },
  garden: { ft: 'lowpass', f: 900, Q: 0.6, hz: 0.2, gain: 0.008, evt: [2, 6] },
  desert: { ft: 'lowpass', f: 260, Q: 0.4, hz: 0.08, gain: 0.014 },
};
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const M = { m: true };

function texEvent(kind: Kind, t: number) {
  if (kind === 'water') {
    const f = rnd(1800, 2600);
    tone({ ...M, s: 0.4, f, f2: f * 0.8, gl: 40, t, D: 0.06, peak: 0.008 });
  } else if (kind === 'bazaar') {
    tone({ ...M, f: 3100, t, D: 0.06, peak: 0.006 });
    tone({ ...M, f: 4170, t, D: 0.06, peak: 0.006 });
  } else if (kind === 'garden') {
    for (let i = 0, n = 2 + Math.floor(Math.random() * 2); i < n; i++) {
      const f = rnd(2800, 4200);
      tone({ ...M, f, f2: f * 1.15, gl: 30, t: t + i * 0.07, D: 0.05, peak: 0.007 });
    }
  }
}

function begin(G: G, kind: Kind, arenaId?: string) {
  const { c } = G, a = arenaMusic(kind, arenaId), tex = TEX[a.tex];
  const t0 = c.currentTime;
  const oscs: AudioScheduledSourceNode[] = [];
  const mg = c.createGain();
  mg.gain.setValueAtTime(0.0001, t0);
  mg.gain.linearRampToValueAtTime(1, t0 + 1.5);
  mg.connect(G.music);
  mbus = mg;
  const osc = (hz: number, type: OscillatorType, dst: AudioNode | AudioParam) => {
    const o = c.createOscillator(); o.type = type; o.frequency.value = hz;
    o.connect(dst as AudioNode); o.start(t0); oscs.push(o);
  };
  const lfo = (hz: number, depth: number, param: AudioParam) => {
    const lg = c.createGain(); lg.gain.value = depth; lg.connect(param); osc(hz, 'sine', lg);
  };
  const gain = (v: number, to: AudioNode) => { const g = c.createGain(); g.gain.value = v; g.connect(to); return g; };

  // drone: tonic + fifth, slowly breathing
  const dg = gain(1, (() => { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; set(lp.frequency, 500); lp.connect(mg); return lp; })());
  osc(a.tonic, 'sine', gain(0.02, dg));
  osc(a.tonic * 1.5, 'triangle', gain(0.01 * (a.drone ?? 1), dg));
  lfo(0.15, 0.25, dg.gain);

  // texture: looped brown noise through a slowly modulated filter
  const src = c.createBufferSource();
  src.buffer = G.brown; src.loop = true;
  const f = c.createBiquadFilter();
  f.type = tex.ft; set(f.frequency, tex.f); set(f.Q, tex.Q);
  const tg = gain(tex.gain, mg);
  src.connect(f); f.connect(tg);
  if (a.tex === 'bazaar') lfo(tex.hz, tex.gain * 0.3, tg.gain); else lfo(tex.hz, tex.f * 0.25, f.frequency);
  src.start(t0);
  src.onended = () => { try { mg.disconnect(); } catch { /* fake node */ } };

  const pat = RHYTHMS[a.rhythm], L = pat.length, ratios = MODE_RATIOS[a.mode];
  const base = a.tonic * 2 ** a.oct;
  const sd = () => 60 / a.bpm / 4;
  let mel: (Note | null)[] = [], cycle = -1, texAt = 0, mirrorAt = 0;

  const play = (n: Note, deg: number, t: number, v: number) => {
    const lead = a.lead === 'alt' ? (cycle % 2 ? 'ney' : 'tar') : a.lead;
    const f = degreeHz(base, ratios, deg), V = { ...M, s: a.send };
    if (lead === 'ney') return ney(f, t, Math.max(0.35, n.dur * sd() * (n.last ? 2 : 1)), v, M);
    (lead === 'tar' ? tar : santur)(f, t, v, V);
  };

  const pump = createPump(() => c.currentTime, sd, (step, time) => {
    const jit = () => Math.max(c.currentTime, time + (Math.random() - 0.5) * 0.016);
    const cs = step % (5 * L);
    if (cs === 0) { mel = genCycle(Math.random, a.rest, L); cycle++; }
    const k = pat[step % L];
    if (k) daf(k, jit(), 0.9 + Math.random() * 0.2, k === 1 ? { ...M, p: 1 } : M);
    if (step % L === 0 && Math.random() < 0.15) daf(4, time, 1, M);
    const n = mel[cs];
    if (n && n.deg !== null) {
      const t = jit(), pos = step % L, v = pos === 0 ? 1 : pos % 4 === 0 ? 0.85 : 0.7;
      if (n.orn === 'g') play(n, n.deg + 1, Math.max(t - sd(), c.currentTime), 0.5);
      if (n.orn === 't') [n.deg, n.deg + 1, n.deg].forEach((d, i) => play(n, d, t + i * 0.5 * sd(), 0.6));
      else play(n, n.deg, t, v);
    }
    if (tex.evt && time >= texAt) { texAt = time + rnd(...tex.evt); texEvent(a.tex, time); }
    if (a.mirror && time >= mirrorAt) {
      mirrorAt = time + rnd(4, 7);
      tone({ ...M, s: 0.7, f: 3520, t: time, D: 0.9, peak: 0.02 });
    }
  });
  pump.start();

  return {
    stop: () => {
      pump.stop();
      if (mbus === mg) mbus = undefined;
      try {
        const t = c.currentTime;
        mg.gain.cancelScheduledValues?.(t);
        mg.gain.setValueAtTime(mg.gain.value, t);
        mg.gain.linearRampToValueAtTime(0.0001, t + 0.4);
        src.stop(t + 0.5);
        oscs.forEach((o) => {
          o.stop(t + 0.5);
          o.onended = () => { try { o.disconnect(); } catch { /* fake node */ } };
        });
      } catch { /* already stopped */ }
    },
  };
}

/** Generative modal bed for the arena (falls back by `kind` when the id is unknown or omitted). */
export function startAmbient(kind: Kind, arenaId?: string) {
  haltAmbient();
  bed = { kind, arenaId };
  if (!musicOn) return;
  const G = gr();
  if (!G) return;
  ambient = begin(G, kind, arenaId);
}

function haltAmbient() {
  ambient?.stop();
  ambient = null;
}

/** Stops the bed and forgets it (leaving the screen). */
export function stopAmbient() {
  haltAmbient();
  bed = null;
}
