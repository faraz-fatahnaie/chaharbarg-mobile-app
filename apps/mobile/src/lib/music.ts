// Pure parts of the generative Persian-modal music bed (see design/audio-design.md section 2).
// No WebAudio here, so everything is unit-testable.
export type Kind = 'wind' | 'water' | 'bazaar' | 'garden' | 'desert';
export type Rng = () => number;

/** Cents above tonic for degrees 1..7. 50-cent offsets are koron/sori quarter-tone approximations. */
export const MODE_CENTS = {
  mahur: [0, 200, 400, 500, 700, 900, 1100],
  shur: [0, 150, 300, 500, 700, 800, 1000],
  segah: [0, 150, 350, 500, 700, 850, 1000],
  chahargah: [0, 150, 400, 500, 700, 850, 1100],
  homayoun: [0, 150, 400, 500, 700, 800, 1000],
} as const;
export type Mode = keyof typeof MODE_CENTS;

export const MODE_RATIOS = Object.fromEntries(
  Object.entries(MODE_CENTS).map(([k, v]) => [k, v.map((c) => 2 ** (c / 1200))]),
) as Record<Mode, number[]>;

/** Degree index i (0..9 in melodies, may go outside for ornaments) to Hz. */
export const degreeHz = (base: number, ratios: number[], i: number) =>
  base * ratios[((i % 7) + 7) % 7] * 2 ** Math.floor(i / 7);

// Steps are 16ths. 0 rest, 1 dum, 2 tak, 3 ghost.
export const RHYTHMS = {
  A44: [1, 0, 0, 3, 2, 0, 3, 0, 1, 0, 1, 0, 2, 0, 3, 3],
  B44: [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 2, 0, 0, 0],
  flow68: [1, 0, 3, 2, 0, 3, 1, 0, 1, 2, 0, 3],
  sparse68: [1, 0, 0, 0, 0, 3, 0, 0, 2, 0, 0, 0],
  hollow68: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
} as const;

export type ArenaMusic = {
  mode: Mode; tonic: number; oct: number; bpm: number; rhythm: keyof typeof RHYTHMS;
  lead: 'santur' | 'tar' | 'ney' | 'alt'; rest: number; tex: Kind;
  send?: number; drone?: number; mirror?: boolean;
};

export const ARENA_MUSIC: Record<string, ArenaMusic> = {
  persepolis: { mode: 'mahur', tonic: 146.83, oct: 1, bpm: 84, rhythm: 'A44', lead: 'santur', rest: 0.45, tex: 'wind' },
  'si-o-se-pol': { mode: 'segah', tonic: 155.56, oct: 1, bpm: 96, rhythm: 'flow68', lead: 'santur', rest: 0.3, tex: 'water' },
  'naqsh-e-jahan': { mode: 'chahargah', tonic: 130.81, oct: 1, bpm: 100, rhythm: 'A44', lead: 'tar', rest: 0.35, tex: 'bazaar' },
  yazd: { mode: 'shur', tonic: 164.81, oct: 1, bpm: 72, rhythm: 'sparse68', lead: 'ney', rest: 0.65, tex: 'desert' },
  'chehel-sotoun': { mode: 'homayoun', tonic: 138.59, oct: 1, bpm: 76, rhythm: 'B44', lead: 'santur', rest: 0.6, tex: 'garden', send: 0.6 },
  eram: { mode: 'mahur', tonic: 174.61, oct: 1, bpm: 104, rhythm: 'flow68', lead: 'tar', rest: 0.3, tex: 'garden' },
  golestan: { mode: 'chahargah', tonic: 123.47, oct: 1, bpm: 88, rhythm: 'B44', lead: 'santur', rest: 0.5, tex: 'garden', mirror: true },
  'tabriz-bazaar': { mode: 'segah', tonic: 110, oct: 1, bpm: 112, rhythm: 'A44', lead: 'tar', rest: 0.2, tex: 'bazaar' },
  'chogha-zanbil': { mode: 'homayoun', tonic: 98, oct: 2, bpm: 60, rhythm: 'hollow68', lead: 'ney', rest: 0.75, tex: 'desert', drone: 1.5 },
  'arg-e-bam': { mode: 'shur', tonic: 130.81, oct: 1, bpm: 68, rhythm: 'B44', lead: 'alt', rest: 0.6, tex: 'desert' },
};

export const FALLBACK_ARENA: Record<Kind, string> = {
  wind: 'persepolis', water: 'si-o-se-pol', bazaar: 'naqsh-e-jahan', garden: 'chehel-sotoun', desert: 'yazd',
};

export const arenaMusic = (kind: Kind, id?: string): ArenaMusic =>
  (id && ARENA_MUSIC[id]) || ARENA_MUSIC[FALLBACK_ARENA[kind]] || ARENA_MUSIC.persepolis;

/** `dur` in 16th steps. deg null = rest. `last` = final cadence note (held an extra slot at playback). */
export type Note = { deg: number | null; dur: number; orn?: 'g' | 't'; last?: boolean };

const MOVES = [-2, -1, 0, 1, 2, 3];
const WEIGHTS = [0.1, 0.3, 0.15, 0.3, 0.1, 0.05];

function pickMove(rng: Rng, progress: number) {
  const w = MOVES.map((m, j) => WEIGHTS[j] * (m < 0 ? 1 + 0.25 * progress : 1)); // contour drifts down
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let j = 0; j < w.length; j++) if ((r -= w[j]) < 0) return MOVES[j];
  return 0;
}
const reflect = (n: number) => Math.min(9, Math.max(0, n > 9 ? 18 - n : n < 0 ? -n : n));

/**
 * One phrase of `slots` 8th-note slots (2 steps each). A ends on degree 3 (half cadence), B on 0 (tonic).
 * `motif` = moves to replay from phrase A. Durations sum to 2*slots steps.
 */
export function genPhrase(rng: Rng, kind: 'A' | 'B', slots: number, rest: number, motif: number[] = []) {
  let i = kind === 'A' ? 4 : 3;
  const moves: number[] = [];
  const notes: Note[] = [];
  let k = 0;
  while (k < slots) {
    if (k >= slots - 2) {
      const first = k === slots - 2;
      const deg = kind === 'A' ? (first ? 2 : 3) : first ? (rng() < 0.5 ? 1 : 2) : 0;
      notes.push(first ? { deg, dur: 2 } : { deg, dur: 2, last: true });
      k++;
      continue;
    }
    if (k > 0 && rng() < rest) { notes.push({ deg: null, dur: 2 }); k++; continue; }
    const mv = moves.length < motif.length ? motif[moves.length] : pickMove(rng, k / slots);
    moves.push(mv);
    i = reflect(i + mv);
    const o = rng();
    const note: Note = { deg: i, dur: 2, ...(o < 0.2 ? { orn: 'g' as const } : o < 0.28 ? { orn: 't' as const } : {}) };
    if (k + 1 < slots - 2 && rng() < rest * 0.5) { note.dur = 4; k += 2; } else k++; // hold into a rest
    notes.push(note);
  }
  return { notes, moves };
}

/** A cycle = phrase A (2 bars), phrase B (2 bars), 1 bar of melody silence. Returns a note-onset array of 5*L steps. */
export function genCycle(rng: Rng, rest: number, L: number): (Note | null)[] {
  const mel: (Note | null)[] = new Array(5 * L).fill(null);
  const A = genPhrase(rng, 'A', L, rest);
  const B = genPhrase(rng, 'B', L, rest, A.moves.slice(0, 3));
  [[A.notes, 0], [B.notes, 2 * L]].forEach(([notes, off]) => {
    let pos = off as number;
    for (const n of notes as Note[]) { if (n.deg !== null) mel[pos] = n; pos += n.dur; }
  });
  return mel;
}

export const LOOKAHEAD = 0.25;
export const TICK_MS = 60;

/** Lookahead scheduler. Audio time derives only from `now()`, never from timer wall-clock. */
export function createPump(now: () => number, stepDur: () => number, onStep: (step: number, time: number) => void) {
  let next = 0, step = 0, gen = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pump = (mine: number) => {
    if (mine !== gen) return;
    if (next < now() - 0.1) next = now() + 0.05; // after a stall: skip, never burst
    while (next < now() + LOOKAHEAD) { onStep(step++, next); next += stepDur(); }
    timer = setTimeout(() => pump(mine), TICK_MS);
  };
  return {
    start() { gen++; step = 0; next = now() + 0.1; pump(gen); },
    stop() { gen++; clearTimeout(timer); timer = undefined; },
  };
}
