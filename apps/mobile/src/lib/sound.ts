// Procedural sound: no audio files to ship, works offline. Replace with recorded Persian-instrument
// loops (santur, tar, daf) later; keep these as the fallback.
let ctx: AudioContext | null = null;
let enabled = true;
let ambient: { stop: () => void } | null = null;

export const setSoundEnabled = (on: boolean) => {
  enabled = on;
  if (!on) stopAmbient();
};

function ac() {
  if (!enabled) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, delay = 0, slide = 0) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const t = c.currentTime + delay;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export type Sfx = 'card' | 'capture' | 'sur' | 'win' | 'lose' | 'click' | 'coin';

export function sfx(kind: Sfx) {
  switch (kind) {
    case 'card': return tone(520, 0.07, 'triangle', 0.08, 0, 0.6);
    case 'click': return tone(660, 0.05, 'sine', 0.06);
    case 'capture': tone(392, 0.12, 'triangle', 0.1); return tone(587, 0.16, 'triangle', 0.1, 0.07);
    case 'coin': tone(988, 0.08, 'square', 0.05); return tone(1319, 0.14, 'square', 0.05, 0.07);
    case 'sur': [392, 494, 587, 784].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.09)); return;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, i * 0.12)); return;
    case 'lose': [392, 349, 311].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, i * 0.14)); return;
  }
}

/** Soft looping bed per arena (filtered noise): wind, water, bazaar murmur, garden, desert. */
export function startAmbient(kind: 'wind' | 'water' | 'bazaar' | 'garden' | 'desert') {
  stopAmbient();
  const c = ac();
  if (!c) return;
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown noise
    d[i] = last * 3.5;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = c.createBiquadFilter();
  const cfg = { wind: [380, 0.5], water: [1400, 0.9], bazaar: [700, 0.4], garden: [900, 0.6], desert: [260, 0.4] }[kind];
  f.type = kind === 'water' ? 'bandpass' : 'lowpass';
  f.frequency.value = cfg[0];
  const g = c.createGain();
  g.gain.value = 0.0001;
  g.gain.linearRampToValueAtTime(0.07 * cfg[1], c.currentTime + 2);
  const lfo = c.createOscillator();
  const lg = c.createGain();
  lfo.frequency.value = kind === 'wind' || kind === 'desert' ? 0.12 : 0.35;
  lg.gain.value = cfg[0] * 0.25;
  lfo.connect(lg).connect(f.frequency);
  src.connect(f).connect(g).connect(c.destination);
  src.start();
  lfo.start();
  ambient = {
    stop: () => {
      try { g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.4); src.stop(c.currentTime + 0.5); lfo.stop(c.currentTime + 0.5); } catch { /* already stopped */ }
    },
  };
}

export function stopAmbient() {
  ambient?.stop();
  ambient = null;
}
