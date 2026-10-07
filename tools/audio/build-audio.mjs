import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RATE, musicScores, effectScores, render, wav } from './score.mjs';

// Second audio pass (03/10/2026): Game Boy-style renderer (gb.mjs) and one loop
// per place. Everything is synthesized from tools/audio; nothing is sampled
// or transcribed from the reference recording.
const destination = new URL('../../public/audio/', import.meta.url);
const docs = new URL('../../docs/audio/', import.meta.url);
await mkdir(destination, { recursive: true }); await mkdir(docs, { recursive: true });
const manifest = { sampleRate: RATE, channels: 1, engine: 'tools/audio/gb.mjs (2 pulse + wave + noise, 64 Hz envelopes, 4x oversampled)',
  provenance: 'Original synthesized score and effects; no samples or transcriptions from the reference video.', files: {} };
const music = musicScores(), effects = effectScores(), pcmOf = {};
for (const [name, score] of [...Object.entries(music), ...Object.entries(effects)]) {
  const pcm = render(score), bytes = wav(pcm); pcmOf[name] = pcm;
  let peak = 0, energy = 0; for (const value of pcm) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
  await writeFile(new URL(`${name}.wav`, destination), bytes);
  manifest.files[name] = { seconds: pcm.length / RATE, bytes: bytes.length, peak, rms: Math.sqrt(energy / pcm.length), sha256: createHash('sha256').update(bytes).digest('hex') };
}
// Listening sample: 9 s of each loop, then the main effects over quiet jungle music.
const parts = [['jungle-loop', 9], ['ropey-loop', 9], ['reptile-loop', 9], ['map-loop', 6]];
const fxOrder = ['jump', 'banana', 'letter', 'roll', 'stomp', 'tire', 'rope', 'lift', 'throw', 'break', 'hit', 'fall', 'respawn', 'checkpoint', 'victory'];
const total = parts.reduce((n, [, s]) => n + s, 0) + fxOrder.length * 1.3 + 2;
const preview = new Float32Array(Math.round(RATE * total));
let at = 0;
for (const [name, seconds] of parts) {
  const src = pcmOf[name], len = Math.round(seconds * RATE), off = Math.round(at * RATE);
  for (let i = 0; i < len; i++) preview[off + i] += src[i % src.length] * Math.min(1, i / (RATE * 0.02), (len - i) / (RATE * 0.6));
  at += seconds;
}
const bedStart = Math.round(at * RATE);
for (let i = bedStart; i < preview.length; i++) preview[i] += pcmOf['jungle-loop'][(i - bedStart) % pcmOf['jungle-loop'].length] * 0.35;
fxOrder.forEach((name, n) => {
  const src = pcmOf[name], off = Math.round((at + 0.4 + n * 1.3) * RATE);
  for (let i = 0; i < src.length && off + i < preview.length; i++) preview[off + i] += src[i] * 0.9;
});
for (let i = 0; i < preview.length; i++) preview[i] = Math.max(-0.98, Math.min(0.98, preview[i] * Math.min(1, (preview.length - i) / (RATE * 0.5))));
await writeFile(new URL('muestra-sonido-gb.wav', docs), wav(preview));
await writeFile(new URL('manifest.json', docs), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Audio: ${Object.keys(manifest.files).length} reproducible WAV files (${Object.keys(music).join(', ')}). Preview: docs/audio/muestra-sonido-gb.wav`);
