// Original score and effects for the four Game Boy-style channels (see gb.mjs).
// Second audio pass (03/10/2026; music rewritten in the third pass below): the user asked for a sound closer to the
// original game. This keeps everything ORIGINAL — no melody, bass line or
// effect is transcribed from the reference — and instead matches the console:
// hard pulse waves with echo on the second pulse (a classic handheld trick),
// a 4-bit wave-channel bass, LFSR-noise jungle percussion, 64 Hz stepped
// envelopes, delayed vibrato and register-quantized pitch slides.
// One track per place: jungle (day), ropey (night), reptile (cave) and map.
import { RATE as GB_RATE, render as gbRender, wav as gbWav, normalize, hz } from './gb.mjs';

export const RATE = GB_RATE;
export const BPM = 112; // jungle tempo; each track has its own below

// ---------------------------------------------------------------- helpers
const chord = { // roots for bass/arpeggios
  G: ['G2', [0, 4, 7]], C: ['C3', [0, 4, 7]], D: ['D3', [0, 4, 7]], D7: ['D3', [0, 4, 10]], Em: ['E2', [0, 3, 7]],
  Bm: ['B2', [0, 3, 7]], Am: ['A2', [0, 3, 7]], F: ['F2', [0, 4, 7]], Dm: ['D3', [0, 3, 7]], E: ['E2', [0, 4, 7]],
  Gm: ['G2', [0, 3, 7]], Bb: ['Bb2', [0, 4, 7]], A: ['A2', [0, 4, 7]], A7: ['A2', [0, 4, 10]],
  Cm: ['C3', [0, 3, 7]], Ab: ['Ab2', [0, 4, 7]], Fm: ['F2', [0, 3, 7]], B: ['B2', [0, 4, 7]], B7: ['B2', [0, 4, 10]],
};
const up = (f, n) => f * 2 ** (n / 12);

function track(bpm, bars) {
  const step = 60 / bpm / 4; // sixteenth note
  return { step, length: bars * 16 * step, events: [] };
}
/** Melody: rows of [note|'r', sixteenths]. Returns note events with their step. */
function melody(T, rows, opts) {
  let s = 0; const out = [];
  for (const [n, d] of rows.flat()) {
    if (n !== 'r') out.push({ ch: opts.ch ?? 'p1', at: s * T.step, len: d * T.step * (opts.gate ?? 0.92), f: hz(n),
      vol: opts.vol, decay: opts.decay, floor: opts.floor, duty: opts.duty, vib: d >= (opts.vibFrom ?? 4) ? opts.vib : undefined });
    s += d;
  }
  if (Math.abs(s - T.length / T.step) > 1e-6) throw new Error(`melody length ${s} != ${T.length / T.step}`);
  T.events.push(...out);
  return out;
}
/** Handheld echo: the lead repeated on pulse 2, later and quieter. */
function echo(T, notes, steps, opts) {
  for (const e of notes) T.events.push({ ...e, ch: 'p2', at: e.at + steps * T.step, vol: Math.max(1, Math.round(e.vol * opts.scale)),
    duty: opts.duty ?? e.duty, decay: opts.decay ?? e.decay, vib: e.vib });
}
/** Wave-channel bass from a per-bar chord list and a 16-step pattern of semitone offsets ('.' = rest). */
function bass(T, chords, pattern, opts = {}) {
  chords.forEach((c, bar) => {
    const root = hz(chord[c][0]);
    pattern.forEach((p, i) => {
      if (p === '.') return;
      const len = opts.len ?? 2;
      T.events.push({ ch: 'w', at: (bar * 16 + i) * T.step, len: len * T.step * 0.95, f: up(root, p), vol: 15, wave: opts.wave ?? 'bass', release: true });
    });
  });
}
/** Pulse-2 arpeggio (chord tones) for bars where the echo rests. */
function arp(T, chords, bars, opts) {
  for (const bar of bars) {
    const [r, tones] = chord[chords[bar]];
    for (let i = 0; i < 16; i += opts.every ?? 1) {
      const n = tones[(i / (opts.every ?? 1)) % tones.length] + 12 * (opts.oct ?? 2);
      T.events.push({ ch: 'p2', at: (bar * 16 + i) * T.step, len: T.step * (opts.every ?? 1) * 0.8, f: up(hz(r), n), vol: opts.vol, decay: 2, duty: opts.duty ?? 12 });
    }
  }
}
// Noise-channel kit (LFSR shift s, divisor r; short = 7-bit metallic mode).
const KIT = {
  k: { noise: { s: 6, r: 3 }, vol: 12, decay: 1, len: 0.06 },          // kick thump
  s: { noise: { s: 3, r: 1 }, vol: 10, decay: 2, len: 0.12 },          // snare
  h: { noise: { s: 1, r: 1, short: true }, vol: 4, decay: 1, len: 0.03 }, // closed hat
  o: { noise: { s: 1, r: 1, short: true }, vol: 4, decay: 4, len: 0.12 }, // open hat
  t: { noise: { s: 5, r: 2 }, vol: 11, decay: 2, len: 0.10 },          // low tom / conga
  m: { noise: { s: 4, r: 1 }, vol: 10, decay: 1, len: 0.07 },          // high tom
  c: { noise: { s: 0, r: 0, short: true }, vol: 7, decay: 1, len: 0.04 }, // shaker / rim
  x: { noise: { s: 2, r: 1 }, vol: 13, decay: 6, len: 0.45 },          // crash
};
function drums(T, bars, patterns) {
  for (let bar = 0; bar < bars; bar++) {
    const pat = typeof patterns === 'function' ? patterns(bar) : patterns;
    [...pat.replace(/\s/g, '')].forEach((c, i) => {
      if (c === '.' || !KIT[c]) return;
      const k = KIT[c];
      T.events.push({ ch: 'n', at: (bar * 16 + i) * T.step, len: k.len, noise: k.noise, vol: k.vol, decay: k.decay });
    });
  }
}

// ---------------------------------------------------------------- music
// Third pass (03/10/2026): the user found the second pass "too cheerful" and
// asked for "more action, more seriousness, neutral action". Still ORIGINAL
// melodies (nothing transcribed). The character comes from: minor / Dorian
// keys, a relentless straight-eighth wave-channel bass ostinato, steady
// straight (unswung) percussion, long held lead notes moving by step in the
// middle register instead of bouncing major arpeggios, and a quiet held
// counter-line on pulse 2.
/** Quiet held counter-line on pulse 2: chord third then fifth, half a bar each. */
function pad(T, chords, bars, opts) {
  for (const bar of bars) {
    const [r, tones] = chord[chords[bar]];
    [tones[1], tones[2]].forEach((t, h) => T.events.push({ ch: 'p2', at: (bar * 16 + h * 8) * T.step, len: 8 * T.step * 0.96,
      f: up(hz(r), t + 12 * (opts.oct ?? 2)), vol: opts.vol, decay: opts.decay ?? 0, floor: opts.floor, duty: opts.duty ?? 12 }));
  }
}

// JUNGLE — driving D Dorian, 112 BPM, 16 bars.
function jungle() {
  const T = track(112, 16);
  const rows = [
    [['D5', 6], ['E5', 2], ['F5', 4], ['E5', 4]], [['D5', 3], ['C5', 3], ['A4', 10]],
    [['C5', 6], ['D5', 2], ['E5', 4], ['G5', 4]], [['E5', 12], ['r', 4]],
    [['F5', 6], ['E5', 2], ['D5', 4], ['F5', 4]], [['G5', 6], ['F5', 2], ['E5', 8]],
    [['D5', 3], ['E5', 3], ['F5', 2], ['A5', 8]], [['G5', 3], ['F5', 3], ['E5', 2], ['C#5', 8]],
    [['Bb5', 8], ['A5', 4], ['G5', 4]], [['D5', 6], ['G5', 2], ['A5', 4], ['Bb5', 4]],
    [['A5', 8], ['F5', 4], ['D5', 4]], [['E5', 3], ['F5', 3], ['A5', 10]],
    [['F5', 6], ['G5', 2], ['F5', 4], ['D5', 4]], [['Bb4', 6], ['D5', 2], ['F5', 8]],
    [['E5', 3], ['G5', 3], ['C6', 2], ['Bb5', 4], ['G5', 4]], [['A5', 6], ['E5', 2], ['C#5', 4], ['A4', 4]],
  ];
  const lead = melody(T, rows, { vol: 12, decay: 8, floor: 7, duty: 25, gate: 0.97, vibFrom: 6, vib: { delay: 14, cents: 14, rate: 5.5 } });
  echo(T, lead.filter(e => e.at < 8 * 16 * T.step), 3, { scale: 0.4, duty: 12 });
  const chords = ['Dm', 'Dm', 'C', 'C', 'Bb', 'C', 'Dm', 'A', 'Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'Bb', 'C', 'A'];
  pad(T, chords, [8, 9, 10, 11, 12, 13, 14, 15], { vol: 5, duty: 12, oct: 2 });
  bass(T, chords, [0, '.', 0, '.', 12, '.', 0, '.', 0, '.', 12, '.', 10, '.', 7, '.'], { wave: 'saw', len: 1.7 });
  drums(T, 16, bar => bar === 0 || bar === 8 ? 'x.h.s.hkk.h.s.h.' : bar % 4 === 3 ? 'k.h.s.hkk.mmttss' : 'k.h.s.hkk.h.s.h.');
  return { name: 'jungle-loop', length: T.length, loop: true, events: T.events, peak: 0.62 };
}

// ROPEY — tense night, E minor, 96 BPM: pedal-bass pulse, long lead notes, congas.
function ropey() {
  const T = track(96, 16);
  const rows = [
    [['E5', 8], ['F#5', 4], ['G5', 4]], [['F#5', 6], ['E5', 2], ['B4', 8]],
    [['C5', 8], ['D5', 4], ['E5', 4]], [['D5', 6], ['B4', 2], ['G4', 8]],
    [['A4', 8], ['C5', 4], ['E5', 4]], [['D5', 6], ['C5', 2], ['A4', 8]],
    [['B4', 6], ['C5', 2], ['D#5', 8]], [['F#5', 12], ['r', 4]],
    [['G5', 8], ['A5', 4], ['B5', 4]], [['A5', 6], ['G5', 2], ['E5', 8]],
    [['C6', 8], ['B5', 4], ['A5', 4]], [['G5', 6], ['F#5', 2], ['E5', 8]],
    [['A5', 8], ['G5', 4], ['F#5', 4]], [['E5', 6], ['D5', 2], ['C5', 8]],
    [['B4', 4], ['D#5', 4], ['F#5', 4], ['A5', 4]], [['G5', 8], ['F#5', 8]],
  ];
  const lead = melody(T, rows, { vol: 11, decay: 10, floor: 6, duty: 25, gate: 0.98, vibFrom: 6, vib: { delay: 16, cents: 16, rate: 5 } });
  echo(T, lead, 6, { scale: 0.4, duty: 12 });
  const chords = ['Em', 'Em', 'C', 'G', 'Am', 'Am', 'B7', 'B', 'C', 'Am', 'Am', 'Em', 'D', 'Am', 'B', 'B'];
  bass(T, chords, [0, '.', 0, '.', 0, '.', 0, '.', 0, '.', 0, '.', 7, '.', 12, '.'], { wave: 'bass', len: 1.6 });
  drums(T, 16, bar => bar % 8 === 7 ? 'k.c.t.c.t.t.mmtt' : 'k.c.t.c.k.c.t.cc');
  return { name: 'ropey-loop', length: T.length, loop: true, events: T.events, peak: 0.58 };
}

// REPTILE — heavy cave, C minor, 104 BPM: sixteenth saw-bass ostinato, low toms.
function reptile() {
  const T = track(104, 16);
  const rows = [
    [['C5', 3], ['C5', 3], ['G4', 2], ['C5', 4], ['Eb5', 4]], [['D5', 6], ['C5', 2], ['G4', 8]],
    [['Eb5', 3], ['Eb5', 3], ['C5', 2], ['Eb5', 4], ['Ab5', 4]], [['G5', 6], ['F5', 2], ['D5', 8]],
    [['C5', 3], ['C5', 3], ['G4', 2], ['C5', 4], ['Eb5', 4]], [['F5', 6], ['Eb5', 2], ['C5', 8]],
    [['Ab5', 6], ['G5', 2], ['F5', 4], ['Eb5', 4]], [['D5', 8], ['B4', 8]],
    [['Eb5', 8], ['C5', 4], ['Ab4', 4]], [['C5', 6], ['Eb5', 2], ['Ab5', 8]],
    [['F5', 8], ['Ab5', 4], ['C6', 4]], [['Bb5', 6], ['Ab5', 2], ['F5', 8]],
    [['Eb5', 4], ['F5', 4], ['G5', 4], ['Ab5', 4]], [['Bb5', 6], ['Ab5', 2], ['G5', 4], ['F5', 4]],
    [['G5', 8], ['D5', 4], ['F5', 4]], [['B4', 6], ['D5', 2], ['G5', 8]],
  ];
  const lead = melody(T, rows, { vol: 12, decay: 6, floor: 5, duty: 25, gate: 0.88, vibFrom: 6, vib: { delay: 14, cents: 14, rate: 6 } });
  echo(T, lead, 4, { scale: 0.45, duty: 25 });
  const chords = ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Fm', 'G', 'Ab', 'Ab', 'Fm', 'Fm', 'Ab', 'Bb', 'G', 'G'];
  bass(T, chords, [0, '.', 0, 12, 0, '.', 0, 10, 0, '.', 0, 12, 7, '.', 10, '.'], { wave: 'saw', len: 1 });
  drums(T, 16, bar => bar % 4 === 3 ? 'k...s..kt.t.mmtt' : 'k...s..kk.k.s...');
  return { name: 'reptile-loop', length: T.length, loop: true, events: T.events, peak: 0.6 };
}

// MAP — steady march between levels, A minor, 112 BPM, 8 bars.
function map() {
  const T = track(112, 8);
  const rows = [
    [['A4', 6], ['B4', 2], ['C5', 4], ['E5', 4]], [['D5', 6], ['C5', 2], ['G4', 8]],
    [['F4', 6], ['G4', 2], ['A4', 4], ['C5', 4]], [['B4', 12], ['r', 4]],
    [['A4', 6], ['B4', 2], ['C5', 4], ['E5', 4]], [['G5', 6], ['F5', 2], ['D5', 8]],
    [['F5', 6], ['E5', 2], ['C5', 4], ['D5', 4]], [['E5', 8], ['G#4', 8]],
  ];
  const lead = melody(T, rows, { vol: 12, decay: 8, floor: 6, duty: 25, gate: 0.95, vibFrom: 6, vib: { delay: 14, cents: 14, rate: 5.5 } });
  echo(T, lead, 3, { scale: 0.38, duty: 12 });
  const chords = ['Am', 'G', 'F', 'G', 'Am', 'G', 'F', 'E'];
  bass(T, chords, [0, '.', 0, '.', 7, '.', 0, '.', 0, '.', 0, '.', 7, '.', 12, '.'], { wave: 'bass', len: 1.6 });
  drums(T, 8, bar => bar === 7 ? 'k...s.s.k.mmttss' : 'k...s.s.k...s.ss');
  return { name: 'map-loop', length: T.length, loop: true, events: T.events, peak: 0.55 };
}

export const TRACKS = ['jungle-loop', 'ropey-loop', 'reptile-loop', 'map-loop'];
export function musicScores() { return Object.fromEntries([jungle(), ropey(), reptile(), map()].map(s => [s.name, s])); }
/** Back-compatible: the Jungle track. */
export function musicScore() { return jungle(); }

// ---------------------------------------------------------------- effects
// Hardware-style recipes: pulse sweeps (like the sweep register), stepped
// envelopes, LFSR noise. Short and punchy, mono, start and end at silence.
const sweep = (from, to, ticks, curve = 1) => (tick, f) => from * (to / from) ** (Math.min(1, tick / ticks) ** curve);
const fx = (events, peak = 0.75) => ({ loop: false, peak, events, length: Math.max(...events.map(e => e.at + e.len)) + 0.03 });
const P = (at, len, f, o = {}) => ({ ch: o.ch ?? 'p1', at, len, f, vol: o.vol ?? 13, decay: o.decay ?? 0, floor: o.floor, duty: o.duty ?? 50, slide: o.slide, vib: o.vib });
const N = (at, len, s, o = {}) => ({ ch: 'n', at, len, noise: { s, r: o.r ?? 1, short: o.short }, vol: o.vol ?? 12, decay: o.decay ?? 1, volFn: o.volFn });
const arpFx = (notes, gap, o = {}) => notes.map((n, i) => P(i * gap, o.len ?? gap * 1.6, hz(n), { ...o, ch: i % 2 && o.alt ? 'p2' : 'p1' }));

export function effectScores() {
  const raw = {
    // Rising pulse "bwip" as the jump is accepted.
    jump: fx([P(0, 0.15, 260, { duty: 50, vol: 12, decay: 3, slide: sweep(260, 820, 7, 0.7) })]),
    // Two bright staccato notes, the second higher: the classic pickup "ting-ting".
    banana: fx([P(0, 0.045, hz('E6'), { duty: 25, vol: 12 }), P(0.045, 0.11, hz('B6'), { duty: 25, vol: 13, decay: 2 })], 0.6),
    letter: fx([...arpFx(['C6', 'E6', 'G6', 'C7'], 0.05, { duty: 50, vol: 12, decay: 3 }), P(0.2, 0.25, hz('C7'), { ch: 'p2', duty: 25, vol: 7, decay: 3 })]),
    roll: fx([N(0, 0.24, 3, { vol: 11, decay: 3, volFn: t => [6, 10, 12, 11, 9, 7, 5, 3, 2, 1, 0][t] ?? 0 }), P(0, 0.12, 180, { duty: 12, vol: 7, decay: 2, slide: sweep(180, 110, 7) })]),
    hit: fx([N(0, 0.1, 2, { vol: 13, decay: 1 }), P(0, 0.34, 620, { duty: 50, vol: 13, decay: 3, slide: sweep(620, 130, 20, 0.8) })]),
    fall: fx([P(0, 0.62, 900, { duty: 25, vol: 12, decay: 5, slide: sweep(900, 90, 38, 1.1), vib: { delay: 0, cents: 40, rate: 9 } })]),
    respawn: fx(arpFx(['A5', 'D6', 'F#6', 'A6'], 0.06, { duty: 25, vol: 10, decay: 3 })),
    checkpoint: fx([...arpFx(['G5', 'B5', 'D6', 'G6', 'B6'], 0.07, { duty: 50, vol: 12, decay: 3, alt: true }), P(0.35, 0.3, hz('D7'), { duty: 12, vol: 8, decay: 3 })]),
    victory: fx([
      P(0, 0.11, hz('G5'), { vol: 13 }), P(0.12, 0.11, hz('C6'), { vol: 13 }), P(0.24, 0.11, hz('E6'), { vol: 13 }),
      P(0.36, 0.2, hz('G6'), { vol: 13, decay: 6 }), P(0.6, 0.11, hz('E6'), { vol: 12 }), P(0.72, 0.62, hz('C7'), { vol: 13, decay: 7, vib: { delay: 8, cents: 25, rate: 6 } }),
      P(0.06, 0.11, hz('E5'), { ch: 'p2', duty: 25, vol: 7 }), P(0.18, 0.11, hz('G5'), { ch: 'p2', duty: 25, vol: 7 }), P(0.30, 0.11, hz('C6'), { ch: 'p2', duty: 25, vol: 7 }),
      P(0.72, 0.62, hz('E6'), { ch: 'p2', duty: 25, vol: 8, decay: 7 }),
      { ch: 'w', at: 0, len: 0.34, f: hz('C3'), vol: 15, wave: 'bass' }, { ch: 'w', at: 0.36, len: 0.2, f: hz('G2'), vol: 15, wave: 'bass' }, { ch: 'w', at: 0.72, len: 0.6, f: hz('C3'), vol: 15, wave: 'bass' },
      N(0, 0.05, 6, { r: 3, vol: 12 }), N(0.36, 0.05, 6, { r: 3, vol: 12 }), N(0.72, 0.45, 2, { vol: 10, decay: 6 }),
    ], 0.75),
    lift: fx([P(0, 0.08, 300, { duty: 25, vol: 11, decay: 2, slide: sweep(300, 420, 4) }), N(0, 0.05, 4, { vol: 8 })]),
    throw: fx([N(0, 0.16, 2, { vol: 10, volFn: t => [4, 9, 11, 9, 6, 4, 2, 1, 0][t] ?? 0 }), P(0, 0.12, 520, { duty: 12, vol: 9, decay: 2, slide: sweep(520, 260, 7) })]),
    break: fx([N(0, 0.18, 3, { short: true, vol: 13, decay: 2 }), N(0.03, 0.12, 5, { r: 2, vol: 11, decay: 2 })]),
    stomp: fx([P(0, 0.12, 200, { duty: 50, vol: 13, decay: 2, slide: sweep(200, 520, 5, 0.6) }), N(0, 0.04, 5, { r: 2, vol: 10 })]),
    defeat: fx([P(0, 0.14, 700, { duty: 25, vol: 11, decay: 2, slide: sweep(700, 200, 8) }), N(0.02, 0.07, 3, { vol: 8 })]),
    tire: fx([P(0, 0.3, 150, { duty: 50, vol: 13, decay: 4, slide: sweep(150, 900, 12, 0.6), vib: { delay: 6, cents: 60, rate: 14 } })]),
    rope: fx([N(0, 0.05, 4, { vol: 7 }), P(0, 0.07, 330, { duty: 12, vol: 9, decay: 2, slide: sweep(330, 280, 4) })], 0.5),
    lesson: fx(arpFx(['D6', 'G6'], 0.07, { duty: 25, vol: 11, decay: 3 }), 0.6),
  };
  return raw;
}

// ---------------------------------------------------------------- output
/** Music is levelled by loudness (RMS) so the four tracks sit at the same volume,
 * with a peak cap; one-shot effects are levelled by peak. */
export const MUSIC_RMS = 0.07;
export function render(score) {
  const pcm = gbRender(score);
  if (score.loop) {
    let e = 0, p = 0; for (const v of pcm) { e += v * v; p = Math.max(p, Math.abs(v)); }
    const k = Math.min(MUSIC_RMS / Math.sqrt(e / pcm.length), (score.peak ?? 0.62) / p);
    for (let i = 0; i < pcm.length; i++) pcm[i] *= k;
  } else normalize(pcm, score.peak ?? 0.7);
  if (!score.loop) { // start/end at silence for one-shot effects
    const fade = Math.min(pcm.length, Math.round(RATE * 0.004));
    for (let i = 0; i < fade; i++) { pcm[i] *= i / fade; pcm[pcm.length - 1 - i] *= i / fade; }
  }
  return pcm;
}
export const wav = gbWav;
