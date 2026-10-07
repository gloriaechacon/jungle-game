// Game Boy (DMG/GBC) style sound renderer — original code, no samples.
//
// Why: the first audio pass used soft band-limited tones (9 harmonics, sine
// "wood" voices). The reference recording is much brighter (spectral centroid
// ~2x, ~7x more energy above 4 kHz) because the real console mixes hard-edged
// square waves, a 4-bit wave channel and LFSR noise. This renderer imitates the
// HARDWARE, not any song:
//   - 2 pulse channels: duty 12.5 / 25 / 50 / 75 %, 11-bit frequency registers
//     (f = 131072 / (2048 - x)), 4-bit volume (0..15).
//   - wave channel: 32 x 4-bit samples, f = 65536 / (2048 - x), output level
//     100 / 50 / 25 %.
//   - noise channel: 15-bit or 7-bit LFSR clocked at 524288 / r / 2^(s+1).
//   - envelopes, vibrato and pitch slides advance in 64 Hz ticks (like the
//     hardware envelope / a sound driver's frame), so volumes step audibly.
//   - one note per channel at a time: a new note cuts the previous one.
//   - each channel's DAC output (0..15) is summed and passed through the
//     console's DC-blocking high-pass, which gives the characteristic thump.
// Rendering is 4x oversampled and decimated with a windowed-sinc filter so
// high notes keep their edges without digital aliasing. Deterministic.

export const RATE = 32000;
const OS = 4, HI = RATE * OS, TICK = 1 / 64;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Quantize to what the hardware registers can play. */
export const pulseHz = hz => 131072 / (2048 - clamp(Math.round(2048 - 131072 / hz), 0, 2047));
export const waveHz = hz => 65536 / (2048 - clamp(Math.round(2048 - 65536 / hz), 0, 2047));
const NOISE_DIV = [0.5, 1, 2, 3, 4, 5, 6, 7];
export const noiseHz = (shift, r = 1) => 524288 / NOISE_DIV[r] / 2 ** (shift + 1);

export const DUTY = { 12: [0, 0, 0, 0, 0, 0, 0, 1], 25: [1, 0, 0, 0, 0, 0, 0, 1], 50: [1, 0, 0, 0, 0, 1, 1, 1], 75: [0, 1, 1, 1, 1, 1, 1, 0] };
/** 4-bit wave-channel tables (32 samples). */
export const WAVES = {
  bass: [0, 2, 4, 6, 8, 10, 12, 14, 15, 15, 15, 14, 14, 13, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 0, 0, 0],
  soft: [8, 10, 12, 13, 14, 15, 15, 15, 15, 15, 14, 13, 12, 10, 8, 7, 7, 5, 3, 2, 1, 0, 0, 0, 0, 0, 1, 2, 3, 5, 7, 7],
  saw: Array.from({ length: 32 }, (_, i) => 15 - (i >> 1)),
  square: Array.from({ length: 32 }, (_, i) => (i < 16 ? 13 : 2)),
  organ: [7, 11, 14, 15, 14, 11, 9, 8, 9, 11, 13, 13, 11, 8, 5, 4, 5, 7, 8, 8, 6, 3, 1, 0, 1, 3, 6, 7, 6, 4, 3, 5],
};

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
/** 'C#5' -> Hz (A4 = 440). */
export function hz(name) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('Bad note ' + name);
  return 440 * 2 ** ((NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
}
export const semis = (name, n) => hz(name) * 2 ** (n / 12);

/**
 * Event: { ch: 'p1'|'p2'|'w'|'n', at: s, len: s, f: Hz (pulse/wave) | noise: {s, r, short},
 *   vol 0..15, decay: ticks per volume step down (0 = hold), floor, duty, wave, level (0..2 shift),
 *   vib: { delay ticks, cents, rate Hz }, slide: (tickIndex, f) => f, volFn(tick) -> 0..15 }
 */
export function render(score) {
  // Whole number of output samples, so a loop wraps on an exact sample boundary.
  const n = Math.round(score.length * RATE) * OS;
  const mix = new Float32Array(n);
  const byCh = {};
  for (const e of score.events) {
    // Loops are circular: anything scheduled past the end (echo tails) wraps around.
    const at = score.loop ? ((e.at % score.length) + score.length) % score.length : e.at;
    (byCh[e.ch] ??= []).push({ ...e, at });
  }
  for (const [ch, list] of Object.entries(byCh)) {
    list.sort((a, b) => a.at - b.at);
    list.forEach((e, i) => {
      // One note per channel: the next note on the same channel cuts this one
      // (for a loop, the last note is cut by the first note of the next pass).
      const next = list[i + 1] ?? (score.loop ? { at: list[0].at + score.length } : undefined);
      let end = e.at + e.len;
      if (next && next.at < end) end = next.at;
      voice(mix, ch, e, end - e.at, n, score.loop);
    });
  }
  return finish(mix, score.loop);
}

function voice(mix, ch, e, len, n, loop) {
  const start = Math.round(e.at * HI), count = Math.round(len * HI);
  const gain = 0.25; // four channels share the DAC range
  let phase = 0, lfsr = 0x7fff, noiseAcc = 0, bit = 1;
  for (let i = 0; i < count; i++) {
    const t = i / HI, tick = Math.floor(t / TICK);
    // ---- volume (4-bit, steps on 64 Hz ticks); short 2-tick release at the cut
    let v = e.volFn ? e.volFn(tick) : e.decay ? Math.max(e.floor ?? 0, e.vol - Math.floor(tick / e.decay)) : e.vol;
    const ticksLeft = (count - i) / HI / TICK;
    if (e.release !== false && ticksLeft < 2) v = Math.floor(v * ticksLeft / 2);
    v = clamp(Math.round(v), 0, 15);
    let level = 0;
    if (ch === 'n') {
      const nz = e.noise; const s = typeof nz.s === 'function' ? nz.s(tick) : nz.s;
      const f = noiseHz(s, nz.r ?? 1);
      noiseAcc += f / HI;
      while (noiseAcc >= 1) {
        noiseAcc -= 1;
        const x = (lfsr ^ (lfsr >> 1)) & 1;
        lfsr = (lfsr >> 1) | (x << 14);
        if (nz.short) lfsr = (lfsr & ~(1 << 6)) | (x << 6);
        bit = ~lfsr & 1;
      }
      level = bit ? v : 0;
    } else {
      let f = e.f;
      if (e.slide) f = e.slide(tick, f);
      if (e.vib && tick >= (e.vib.delay ?? 0)) f *= 2 ** ((e.vib.cents / 1200) * Math.sin(2 * Math.PI * (e.vib.rate ?? 6) * t));
      f = ch === 'w' ? waveHz(f) : pulseHz(f);
      phase = (phase + f / HI) % 1;
      if (ch === 'w') {
        const table = WAVES[e.wave ?? 'bass'];
        const s = table[Math.floor(phase * 32)];
        // The wave channel has no envelope, only an output level (100/50/25 %):
        // map the event volume onto those three steps.
        const shift = e.level ?? (v >= 11 ? 0 : v >= 6 ? 1 : v >= 2 ? 2 : -1);
        level = shift < 0 ? 0 : s >> shift;
      } else level = DUTY[e.duty ?? 50][Math.floor(phase * 8)] ? v : 0;
    }
    let idx = start + i;
    if (idx >= n) { if (!loop) break; idx %= n; }
    mix[idx] += (level / 15) * gain;
  }
}

// High-pass (console output capacitor), then low-pass + decimate 4x.
function finish(hiMix, loop) {
  const n = hiMix.length;
  // DC blocker ~ 20 Hz at the oversampled rate; for loops run two passes so
  // the filter state at the seam is the steady state (no click at the join).
  const a = Math.exp(-2 * Math.PI * 20 / HI);
  const out = new Float32Array(n);
  let x1 = 0, y1 = 0;
  for (let pass = 0; pass < (loop ? 2 : 1); pass++) for (let i = 0; i < n; i++) {
    const x = hiMix[i]; const y = a * (y1 + x - x1); x1 = x; y1 = y; if (pass === (loop ? 1 : 0)) out[i] = y;
  }
  // Windowed-sinc low-pass at 14 kHz (keeps the bright edges, removes aliases).
  const taps = 63, fc = 14000 / HI, k = new Float32Array(taps);
  let sum = 0;
  for (let i = 0; i < taps; i++) {
    const m = i - (taps - 1) / 2;
    const sinc = m === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * m) / (Math.PI * m);
    k[i] = sinc * (0.42 - 0.5 * Math.cos(2 * Math.PI * i / (taps - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (taps - 1)));
    sum += k[i];
  }
  for (let i = 0; i < taps; i++) k[i] /= sum;
  const m = Math.floor(n / OS), pcm = new Float32Array(m), half = (taps - 1) / 2;
  for (let j = 0; j < m; j++) {
    let acc = 0; const c = j * OS;
    for (let t = 0; t < taps; t++) {
      let idx = c + t - half;
      if (idx < 0 || idx >= n) { if (!loop) continue; idx = (idx + n) % n; }
      acc += out[idx] * k[t];
    }
    pcm[j] = acc;
  }
  return pcm;
}

export function wav(pcm, rate = RATE) {
  const out = Buffer.alloc(44 + pcm.length * 2);
  out.write('RIFF'); out.writeUInt32LE(out.length - 8, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(pcm.length * 2, 40);
  for (let i = 0; i < pcm.length; i++) {
    if (!Number.isFinite(pcm[i]) || Math.abs(pcm[i]) >= 1) throw new Error('Non-finite/clipping PCM');
    out.writeInt16LE(Math.round(pcm[i] * 32767), 44 + i * 2);
  }
  return out;
}

/** Scale to a target peak (keeps headroom for effects over music). */
export function normalize(pcm, peak) {
  let p = 0; for (const v of pcm) p = Math.max(p, Math.abs(v));
  if (p > 0) for (let i = 0; i < pcm.length; i++) pcm[i] *= peak / p;
  return pcm;
}
