# Chaharbarg Audio Design (procedural WebAudio)

Scope: replace `apps/mobile/src/lib/sound.ts` internals. No audio files, offline, mobile webview, one file, ~250 lines TS (<6 kB min). Only `sound.ts` changes, plus callers pass the arena id to `startAmbient`.

## 0. Pillars and feel

- Warm, plucked, Persian: santur/tar/daf/ney, never chiptune beeps. Every SFX is a "tuned" event in the arena's mode family (D/Mahur pentatonic by default) so rapid SFX never clash.
- Reward ladder (Clash Royale logic): tick < place < capture < score pops < sur < win. Each step up adds layers (more voices, shimmer, reverb send, longer tail, music duck).
- Music is a bed, SFX are the foreground. Music peaks sit 8-10 dB under SFX peaks.
- Anything gameplay-critical (turn chime, timer tick, capture) is never masked: it ducks music, never the reverse.

## 1. Sonic identity and instrument recipes

Notation: `A5 D70` = linear attack 5 ms to peak, then exponential decay to 0.0001 over 70 ms (use `setValueAtTime(0.0001,t)`, `linearRamp` to peak, `exponentialRamp` down). `S/R` = sustain level / release ms. `f→g/70ms` = exponential freq glide over 70 ms. Gains are linear; dB reference: 0.5=-6, 0.25=-12, 0.125=-18, 0.06=-24, 0.03=-30, 0.015=-36.
`v` = velocity 0..1 multiplier on peak. Every voice ends with `osc.stop(t+dur+0.05)` and `onended = () => nodes.disconnect()`.

**santur** `santur(f,t,v)`: triangle `f` + sine `f*1.0035` (second string of the course) + sine `f*2.76` at 0.25 relative gain with D60 (hammer inharmonic click). Peak 0.16*v, A2, D = clamp(0.9*(261/f)^0.3, 0.35, 1.1) s. Lowpass at `min(f*8, 6000)`, Q 0.7. Reverb send 0.35.

**tar/setar** `tar(f,t,v)`: sawtooth `f` + sawtooth `f*1.006`; lowpass freq env 3200→700 over 180 ms (Q 3); amp A3, D450, peak 0.10*v. Send 0.25. (Karplus-Strong via DelayNode feedback is NOT used: a feedback loop in WebAudio has a minimum delay of one 128-sample block, so pitch tops out near 340 Hz at 44.1 kHz. Filtered saw reads as a pluck on phone speakers. Upgrade path: KS only for sub-330 Hz bass notes if wanted.)

**daf** `daf(kind,t,v)`, shared noise buffer, `start(t, random offset)`:
- dum (1): sine 150→70/90ms A1 D160 peak 0.22 + noise lowpass 400 A1 D20 peak 0.08.
- tak (2): noise bandpass 2400 Q1.2, A1 D45, peak 0.14. ghost (3): same, filter 3000, peak 0.05.
- ring (jingles, accent): 3 noise bursts bandpass 7000 Q8, 12 ms each, spaced 14 ms, peak 0.04. Added on step 0 of a bar with p=0.15.

**ney** `ney(f,t,dur,v)`: sine `f` + triangle `f*2` at 0.15 gain; breath = noise bandpass `f*2` Q6 at 0.35 gain. Pitch scoop `0.97f→f/60ms`. Vibrato: sine LFO 5.2 Hz, depth `f*0.006`, fades in after 120 ms. Env A90, S0.8, R160, peak 0.09*v. Send 0.45.

**drone**: two persistent oscillators, sine `tonic` (gain 0.020) and triangle `tonic*1.5` (gain 0.010), through lowpass 500. A 0.15 Hz sine LFO modulates the drone gain +-25%.

**Master chain** (build once per `AudioContext`, feature-detect every node with `typeof c.createX === 'function'`; the fake ctx in tests lacks them, fall back to `destination`):

```
sfxBus(0.80) ----------------\
musicBus(0.50, ducked) ------+--> master(0.90) -> compressor -> destination
reverb return(0.25) ---------/
compressor: threshold -14 dB, knee 12, ratio 4, attack 0.004, release 0.18
reverb: send bus -> 3 parallel DelayNodes t=[0.037,0.053,0.079] s,
        each loop: feedback gain 0.42 + lowpass 2800 in the loop -> return
        (a cycle containing a DelayNode is legal). Mono, constant cost.
```

Per-voice `send` = gain into the reverb send bus. All param writes use a helper that no-ops if the param is missing (`p?.value = ..` style; fake filters have no `Q`, no `detune`).

## 2. Music bed (generative, endless; no loop seam)

### 2.1 Modes (cents above tonic; degrees 1-7; octave = 1200). Quarter tones are 50-cent offsets, tuned approximate, adjust by ear.

| Mode | cents | ratios (deg 1..7) |
|---|---|---|
| Mahur | 0 200 400 500 700 900 1100 | 1, 1.1225, 1.2599, 1.3348, 1.4983, 1.6818, 1.8877 |
| Shur | 0 150 300 500 700 800 1000 | 1, 1.0905, 1.1892, 1.3348, 1.4983, 1.5874, 1.7818 |
| Segah | 0 150 350 500 700 850 1000 | 1, 1.0905, 1.2241, 1.3348, 1.4983, 1.6338, 1.7818 |
| Chahargah | 0 150 400 500 700 850 1100 | 1, 1.0905, 1.2599, 1.3348, 1.4983, 1.6338, 1.8877 |
| Homayoun | 0 150 400 500 700 800 1000 | 1, 1.0905, 1.2599, 1.3348, 1.4983, 1.5874, 1.7818 |

Degree index `i` (0..9, range of ~1.4 octaves) -> `Hz = leadBase * ratio[i%7] * 2^floor(i/7)`. Store cents, compute `2**(c/1200)` at module load.

### 2.2 Arena table (keyed by `Arena.id`; do not edit arenas.ts)

`leadBase = tonic * 2^oct`. `rest` = chance a melody slot is silent. Texture = existing `ambient` kind (see 2.6).

| arena id | mode | tonic Hz | oct | bpm | rhythm | lead | rest | texture / extra | character |
|---|---|---|---|---|---|---|---|---|---|
| persepolis | Mahur | 146.83 | 1 | 84 | 4/4 A | santur | .45 | wind | stately |
| si-o-se-pol | Segah | 155.56 | 1 | 96 | 6/8 flow | santur, short notes | .30 | water + drips | flowing arches |
| naqsh-e-jahan | Chahargah | 130.81 | 1 | 100 | 4/4 A | tar | .35 | bazaar | lively square |
| yazd | Shur | 164.81 | 1 | 72 | 6/8 sparse | ney | .65 | desert | hot, still |
| chehel-sotoun | Homayoun | 138.59 | 1 | 76 | 4/4 B | santur, send .6 | .60 | garden | mirrored pool |
| eram | Mahur | 174.61 | 1 | 104 | 6/8 flow | tar, bright | .30 | garden birds | cheerful |
| golestan | Chahargah | 123.47 | 1 | 88 | 4/4 B | santur + mirror blips | .50 | garden hush | regal |
| tabriz-bazaar | Segah | 110.00 | 1 | 112 | 4/4 A | tar | .20 | bazaar | busy |
| chogha-zanbil | Homayoun | 98.00 | 2 | 60 | 6/8 sparse | ney only, drone x1.5 louder | .75 | desert | ancient, hollow |
| arg-e-bam | Shur | 130.81 | 1 | 68 | 4/4 B | ney and tar alternate per phrase | .60 | desert | lonely |

`mirror blips` (golestan): every 4-7 s a sine 3520 Hz, A1 D900, peak 0.02, send 0.7.
Fallback when `startAmbient(kind)` is called without an arena id: wind=persepolis, water=si-o-se-pol, bazaar=naqsh-e-jahan, garden=chehel-sotoun, desert=yazd.

### 2.3 Rhythm (steps are 16ths; `step = 60/bpm/4` s; values 0 rest, 1 dum, 2 tak, 3 ghost)

```
4/4 A (16): [1,0,0,3, 2,0,3,0, 1,0,1,0, 2,0,3,3]
4/4 B (16): [1,0,0,0, 0,0,2,0, 0,0,1,0, 2,0,0,0]     // sparse, regal
6/8 flow (12): [1,0,3, 2,0,3, 1,0,1, 2,0,3]
6/8 sparse (12): [1,0,0, 0,0,3, 0,0,2, 0,0,0]       // chogha-zanbil: [1,0,0, 0,0,0, 0,0,0, 0,0,0]
```

Humanize: timing +-8 ms, velocity x(0.9..1.1). Daf bus level: peaks above (0.22 dum) on musicBus -> about -20 dBFS at the master.

### 2.4 Melody phrase generator

A phrase = 2 bars on an 8th grid (every 2 steps; 4/4: 8 slots/bar, 6/8: 6 slots/bar). Two phrases per cycle: A (question) and B (answer), then 1 bar of melody silence (breath; drone and daf continue).

```
state: i (degree index), start i=4 (dominant) for A, i=3 for B
per slot k of N slots:
  if k >= N-2 (cadence):
     A: slot N-2 -> i=2, slot N-1 -> i=3  (half cadence on the 4th/5th area; hold 4 steps)
     B: slot N-2 -> i in {1,6(down an octave: -1)} (p .5 each), slot N-1 -> i=0 (tonic), hold 4 steps
  else if rand() < rest: rest (never on slot 0 nor within a 2-slot cadence)
  else: move = weighted pick from
        { -2:.10, -1:.30, 0:.15, +1:.30, +2:.10, +3:.05 }
        weight *= 1 + 0.25*progress if move<0   // contour drifts downward (forud) as the phrase ends
        clamp i to [0,9]; on clamp, reflect
  duration (steps): 2 (.55), 1 (.15 after a 2-slot gap only), 4 (.30, only if next slot would be a rest)
  ornament: p .20 grace note (degree i+1, 1 step early, v .5); p .08 trill (3 notes of 0.5 step, degrees i,i+1,i)
phrase B on the same pass: seed from a copy of A's first 3 moves (motif reuse) before free walking.
```

Lead voice by arena column: santur/tar play every note; ney plays only notes of duration >=2 (breathy; others skipped), max 1 ney voice at a time (retrigger fades the old one in 40 ms). Melody velocity 0.7..1 by beat position (slot 0 = 1).

### 2.5 Lookahead scheduler (no drift)

```ts
const LOOKAHEAD = 0.25, TICK_MS = 60;           // tolerant of webview timer jank
let next = c.currentTime + 0.1, step = 0, gen = 0;
function pump(myGen) {
  if (myGen !== gen) return;                    // stopAmbient bumps gen
  if (next < c.currentTime - 0.1) next = c.currentTime + 0.05;   // after stall: skip, never burst
  while (next < c.currentTime + LOOKAHEAD) { scheduleStep(step++, next); next += stepDur; }
  timer = setTimeout(() => pump(myGen), TICK_MS);
}
```

Audio time is only ever `next` (derived from `currentTime`), never from timer wall-clock, so jitter in `setTimeout` never reaches the audio. A suspended ctx (autoplay policy, no gesture yet) freezes `currentTime`, so the while loop schedules at most 0.25 s then idles: no flood. `ac()` already calls `resume()`; call `startAmbient` again from first user gesture if needed. `pump` runs once synchronously from `startAmbient`. `scheduleStep` plays daf for the step, the pre-computed melody note whose onset == step (phrase generated one phrase ahead into an array), and texture events. `stepDur` is read each step, so tempo changes never glitch.

Lifecycle: `startAmbient` = stopAmbient (fade 0.4 s) + new `gen`, music bus fade in 0 -> 0.50 over 1.5 s; drone/texture oscillators started once and stopped in `stop()` after 0.5 s. `setMusicEnabled(false)` = stopAmbient (existing). `document.visibilitychange` hidden: `c.suspend()`, visible: `resume()` (optional, 4 lines).

### 2.6 Texture layer (kept very low: far under the drone)

One looping `createBufferSource` of a 2 s brown-noise buffer generated once (the only per-sample JS loop; cached per ctx; reused by daf/ney/SFX noise with `start(t, rand*1.5)`). The existing test requires `createBufferSource` in ambient even with effects off: this source is it.

| kind | filter | LFO | gain | events (scheduler, random interval) |
|---|---|---|---|---|
| wind | lowpass 380 Q.7 | 0.12 Hz, +-25% freq | 0.014 | none |
| water | bandpass 1400 Q.9 | 0.35 Hz | 0.012 | every 1.5-4 s drip: sine 2200 +-400 → x0.8/40ms, A1 D60, peak 0.008, send .4 |
| bazaar | bandpass 700 Q.5 | 0.8 Hz amp +-30% | 0.012 | every 3-8 s chime: sines 3100 + 4170, A1 D60, peak 0.006 |
| garden | lowpass 900, + chirps | 0.2 Hz | 0.008 | every 2-6 s: 2-3 sine blips 2800-4200 Hz glide up x1.15/30ms, 50 ms each, peak 0.007 |
| desert | lowpass 260 Q.4 | 0.08 Hz | 0.014 | none |

Fade-in 2 s (existing behavior). The old gain 0.07 was too loud; new levels are about -37 dB.

### 2.7 Ducking

`musicBus.gain` ducked by sfx with priority:

| priority | sfx | duck to | attack | hold | release |
|---|---|---|---|---|---|
| 0 | click, select, deal, card, score, timer | none | | | |
| 1 | capture, turn, coin, sticker | 0.70 (-3 dB) | 10 ms | 120 ms | 300 ms |
| 2 | sur, sarbaz | 0.35 (-9 dB) | 10 ms | 600 ms | 500 ms |
| 3 | win, lose | 0.20 (-14 dB) | 30 ms | 2200 ms | 900 ms |

Implementation: `p.cancelScheduledValues?.(t); p.setValueAtTime(p.value,t); p.linearRampToValueAtTime(level*0.50,t+att); p.setValueAtTime(level*0.50,t+att+hold); p.linearRampToValueAtTime(0.50,t+att+hold+rel)`. Only linear ramps and `setValueAtTime` (fake ctx supports exactly these). Lower priority never shortens a deeper active duck (track `duckUntil`, `duckLevel`).

### 2.8 CPU and voice budget

- Max live voices 24 (music <= 10, SFX <= 14); counter incremented on create, decremented in `onended`. Over cap: drop music melody first, then priority-0 SFX; never drop daf dum, drone, or priority >=1 SFX.
- Persistent nodes: ~8 (drone 2 + LFO 2 + noise src + 3 reverb delays). Per voice <= 3 oscillators. Typical load 6-10 voices.
- No per-sample JS after the one-time noise fill. No `ScriptProcessor`/Worklet.

## 3. SFX table

Signature: `sfx(kind: Sfx, n = 0)`. `n` is optional: score index (0-based) or timer urgency. Gated by `effectsOn` at the top of `sfx`/voice creation (the music scheduler does NOT use that gate). All kinds below use shared helpers: `tone(type,f0,f1,glideMs,t,A,D,peak,send,filter?)`, `noise(filterType,fHz,Q,t,A,D,peak)`, `santur`, `tar`, `daf`, `ney`, `bell(f,t,D,peak)` = sine `f` + sine `f*2.76` at 0.25, A1.

| kind | role | priority | recipe (t0 = now) |
|---|---|---|---|
| `click` (keep) | button | 0 | tri 880→660/30ms, A1 D50, peak 0.06 |
| `select` (new) | tap-select tick | 0 | sine 1320 + tri 1980 at 0.4, A1 D45, peak 0.06 |
| `deal` (new) | card slide | 0 | noise bandpass 2200→1200/90ms Q1, A5 D90, peak 0.10; + tri 300→200/60ms A2 D70 peak 0.04 |
| `card` (keep) | card place thud | 0 | sine 180→70/90ms A1 D110 peak 0.22; + noise lowpass 900 A1 D35 peak 0.10; + tri 520→300/50ms A1 D60 peak 0.04 |
| `capture` (keep) | rising sweep | 1 | saw 330→990/260ms through lowpass 1200→4200/260ms Q4, A10, S1, R40, total 300 ms, peak 0.10; noise highpass 3000→7000/250ms A20 D250 peak 0.04; `santur(660,t+0.22,.9)` + `santur(990,t+0.27,.9)`; send .2 |
| `score` (new) | point pop, `n`=index | 0 | `f = 523.25 * R[n%5] * 2^floor(n/5)`, `R=[1,1.1225,1.2599,1.4983,1.6818]` (Mahur pentatonic), cap n at 14; sine `0.92f→f/12ms`, A1 D90, peak 0.09; + sine `2f` at 0.3 D40; + `santur(f,t,0.5)` with D clamped to 0.22 s. Caller fires every 90-110 ms |
| `turn` (new) | your turn chime | 1 | `bell(880,t,500,.06)`, `bell(1318.5,t+0.11,500,.06)`, send .35 |
| `timer` (new) | low-time tick; `n`=1 for last 3 s | 0 | n=0: tri 1000→900/20ms A1 D35 peak 0.08. n=1: tri 1400→1250/20ms A1 D45 peak 0.11 + sine 700 A1 D60 peak 0.05 |
| `coin` (keep name) | shahi | 1 | `bell(1568,t,260,.06)`, `bell(2093,t+0.065,300,.06)`; noise highpass 8000 A1 D12 peak 0.02; send .25 |
| `sticker` (new) | sticker pop | 1 | sine 300→900/70ms A2 D100 peak 0.10; sine 1400 A1 D120 peak 0.04 at t+0.05; noise highpass 4000 A1 D15 peak 0.03 |
| `sur` (keep) | big celebration | 2 | santur strum (35 ms apart, v .8..1): 293.66, 369.99, 440, 587.33, 739.99, D up to 1.1 s; pad: saw 293.66 + saw `440*1.004`, lowpass 1800, A30 D900 peak 0.06; daf dum t0 + tak t+0.12; shimmer: 6 sine blips from t+0.15 every 55 ms, freqs random from [1760,2093,2349,2793,3136,3520], A1 D120 peak 0.03, send .5. About 24 oscillators for 1.3 s, fine under cap |
| `sarbaz` (new) | sur sarbaz (jack sur) | 2 | daf roll: tak at 0/50/100/150 ms, v .5/.7/.85/1.0 then dum at 200 ms; at t+0.2 `tar` chord 293.66, 440, 587.33 (peak 0.10, D700); 3 shimmer blips from t+0.3. Martial, smaller than `sur` |
| `win` (keep) | fanfare ~2 s | 3 | daf dum/tak/tak at 0/0.11/0.22; tar arpeggio 293.66, 369.99, 440, 587.33 at 0.11 s spacing (D500); at t+0.45 santur chord (as `sur`) + ney 587.33 for 0.9 s (peak .07) + 8 shimmer blips; final dum at t+0.45 |
| `lose` (keep) | Shur lament, not "sad trombone" | 3 | ney 440 (400 ms), 392 (300), 349.2 (300), 293.66 (800 ms, R300), vibrato depth `f*0.01`, peak 0.08; drone sine 73.42 A200 D1500 peak 0.05; `santur(146.83,t+1.5,.6)` |

Type: `export type Sfx = 'card'|'capture'|'sur'|'win'|'lose'|'click'|'coin'|'deal'|'select'|'score'|'turn'|'timer'|'sarbaz'|'sticker'`.

## 4. API (compatible)

```ts
export const setMusicEnabled(on: boolean)    // false => stopAmbient()
export const setEffectsEnabled(on: boolean)  // gates sfx only
export function sfx(kind: Sfx, n = 0)
export function startAmbient(kind: 'wind'|'water'|'bazaar'|'garden'|'desert', arenaId?: string)
export function stopAmbient()
```

Callers that start the arena bed should pass `arena.id` (`startAmbient(a.ambient, a.id)`). Without it the fallback in 2.2 applies, so nothing breaks. Unknown id => fallback by `kind`.

Existing tests (`sound.test.ts`) must pass unmodified. Constraints this puts on the code:
1. Effects off: `sfx('click')` returns before `createOscillator`.
2. Music off: `startAmbient` returns before `ac()` and before any `createBufferSource`.
3. Effects off + music on: `startAmbient` synchronously calls `createBufferSource` (texture noise) and runs the first `pump`.
4. The fake ctx has only `createOscillator/createGain/createBiquadFilter/createBuffer/createBufferSource`, `currentTime` fixed at 0, `sampleRate` 8, and chain nodes with only `frequency`/`gain` params. So: guard `createDynamicsCompressor`, `createDelay`, `createStereoPanner`; guard `Q`, `detune`, `cancelScheduledValues`, `setTargetAtTime`; use only `setValueAtTime`, `linearRampToValueAtTime`, `exponentialRampToValueAtTime`. With `currentTime` frozen, `pump` schedules at most one lookahead window and then waits on `setTimeout`; `stopAmbient` clears it.

## 5. Mix targets

| Element | Peak (gain at source) | Target at master |
|---|---|---|
| Music bus total | 0.50 | short-term loudness about -26 LUFS, peaks -14 dBFS |
| Drone | 0.030 | -36 dB re full scale |
| Daf dum / tak | 0.22 / 0.14 | -20 / -24 dBFS |
| Melody (santur/tar/ney) | 0.16 / 0.10 / 0.09 | -22 dBFS |
| Texture | 0.008-0.014 | -40 dBFS, inaudible as "a sound", felt as space |
| Priority 0 SFX | 0.04-0.22 | -16 to -12 dBFS peak |
| Priority 1 SFX | 0.06-0.12 | -10 dBFS peak |
| `sur`/`sarbaz`/`win` | sum up to ~0.5 | -6 to -3 dBFS peak, never clip (compressor catches) |

Rules: SFX vs music peak delta >= 8 dB at all times; master limiter is the compressor above; no SFX or bed content below 60 Hz except `card`/dum thump (phone speakers reproduce nothing there; keeps headroom); all SFX tails < 2.5 s; no continuous high-frequency energy above 6 kHz except texture chirps/shimmer.

## 6. Test checklist

Automated (extend `sound.test.ts`, do not change the 3 existing tests):
- [ ] The 3 existing tests pass unchanged.
- [ ] Every `Sfx` kind runs against the fake ctx without throwing (loop over the list, with `n` 0 and 7).
- [ ] `startAmbient` for each of the 10 arena ids and each of 5 kinds does not throw; unknown id falls back.
- [ ] `stopAmbient` then `startAmbient` leaves one pending timer (`vi.useFakeTimers`, `vi.getTimerCount() === 1`); `stopAmbient` leaves 0.
- [ ] Phrase generator (pure function, seedable rng): all degrees in [0,9]; phrase B last note is index 0; phrase A last note index 3; durations sum to the phrase length. Mode tables are 7 strictly increasing cents < 1200.
- [ ] Voice cap: firing 40 `sur` calls creates no more than 24 live voices (decrement path is exercised by calling `onended` of the mock).
- [ ] Disabling effects mid-ambient: music scheduler keeps scheduling daf/melody (they do not check `effectsOn`).

Manual on a real phone (iOS Safari/webview and Android Chrome), speaker and headphones:
- [ ] First tap unlocks audio; no click or pop at ambient start/stop or arena switch (0.4 s fade out, 1.5 s fade in).
- [ ] Background the tab for 30 s and return: no burst of catch-up notes.
- [ ] Each arena is distinguishable by ear in 10 s (mode, tempo, lead instrument). The bed never sounds like a loop.
- [ ] Capture sweep and turn chime are audible over the busiest arena (tabriz-bazaar).
- [ ] `score` x 10 in a row rises smoothly and stays in tune with the bed (Mahur pentatonic vs other modes is a mild, acceptable clash).
- [ ] Win/lose duck the bed and it returns smoothly with no pump.
- [ ] 10 minutes in tabriz-bazaar: CPU stays flat, no growth in node count (check `performance.memory` / Web Audio inspector), no stutter.
- [ ] Toggling Music and Effects independently behaves as labeled.

## 7. Skipped, add when

- Real Karplus-Strong tar: add if saw-plucks sound thin on tester feedback (bass register only; see 1).
- Stereo panning and per-arena reverb size: add when mono reverb feels samey.
- Intensity layers (extra daf density at low timer or high score): add after the base bed ships; hook is `rest`/pattern swap in the scheduler.
