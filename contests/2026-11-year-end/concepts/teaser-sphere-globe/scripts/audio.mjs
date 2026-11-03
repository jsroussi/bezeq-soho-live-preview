// The teaser's score, generated in code from src/timeline.js (original, no samples, no copyrighted music): a pad that
// opens over Israel, a synth pulse that builds to the title, a soft whoosh per arc, a small bell per arrival and one hit
// on the title. Writes a 48 kHz stereo WAV; scripts/render.mjs normalises it to about -16 LUFS, ≤ -1 dBTP.
// node scripts/audio.mjs <cut> <out.wav> [sfx]   (sfx: the effects only, to lay over the owner's Suno track)
import { writeFileSync, readFileSync } from 'node:fs';
import { CUTS } from '../teaser.config.js';
import { events } from '../src/timeline.js';

const cutId = process.argv[2] || 'master', out = process.argv[3] || `build/${cutId}/score.wav`, sfxOnly = process.argv[4] === 'sfx';
const cut = CUTS[cutId];
const stops = JSON.parse(readFileSync(new URL('../../../contest.json', import.meta.url))).journey.stops;
const ev = events(cut, stops);
const SR = 48000, N = Math.round(cut.duration * SR);
const L = new Float32Array(N), R = new Float32Array(N);

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = mulberry32(1112026);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

const tTitle = ev.title, bpm = 120, beat = 60 / bpm;
const pulseFrom = cut.legs.start - 2 * beat;

// 1) pad: D minor add9, detuned saws through a one-pole low-pass that opens toward the title
if (!sfxOnly) {
  const notes = [38, 45, 50, 53, 57, 64], ph = notes.map(() => [rand(), rand()]);
  let lpL = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const env = ramp(t, 0, 2.5) * (1 - 0.35 * ramp(t, tTitle - 0.2, tTitle + 0.3) + 0.35 * ramp(t, tTitle + 0.3, tTitle + 2)) * (1 - ramp(t, cut.duration - 1.6, cut.duration));
    let sL = 0, sR = 0;
    notes.forEach((m, k) => {
      const f = hz(m);
      for (let d = 0; d < 2; d++) {
        ph[k][d] = (ph[k][d] + f * (1 + (d ? 0.0035 : -0.0035)) / SR) % 1;
        const saw = 2 * ph[k][d] - 1;
        if (d) sR += saw; else sL += saw;
      }
    });
    const cutoff = 300 + 2600 * ramp(t, 2, tTitle) ** 1.6 + 1400 * ramp(t, tTitle, tTitle + 1.5);
    const a = 1 - Math.exp(-2 * Math.PI * cutoff / SR);
    lpL += a * (sL - lpL); lpR += a * (sR - lpR);
    add(i, lpL * 0.035 * env, lpR * 0.035 * env);
  }
}

// 2) pulse: a short sine kick on each beat from just before the first arc, louder toward the title; a soft tick off-beat
for (let b = 0; !sfxOnly; b++) {
  const t0 = pulseFrom + b * beat;
  if (t0 > tTitle - 0.01) break;
  const lvl = 0.25 + 0.75 * ramp(t0, pulseFrom, tTitle) ** 1.3;
  let ph = 0;
  for (let i = 0; i < 0.4 * SR; i++) {
    const t = i / SR, f = 45 + 95 * Math.exp(-t * 28);
    ph += 2 * Math.PI * f / SR;
    const s = Math.sin(ph) * Math.exp(-t * 9) * 0.55 * lvl;
    add(Math.round(t0 * SR) + i, s, s);
  }
  if (t0 > cut.legs.start + 2) { // off-beat tick: high-passed noise, 25 ms
    const ts = t0 + beat / 2; let prev = 0;
    for (let i = 0; i < 0.025 * SR; i++) {
      const n = rand() * 2 - 1, hp = n - prev; prev = n;
      const s = hp * Math.exp(-i / SR * 160) * 0.06 * lvl;
      add(Math.round(ts * SR) + i, s * 0.8, s);
    }
  }
}

// 3) a whoosh per arc: noise through a band-pass whose centre sweeps up, panned across
ev.legs.forEach((leg, k) => {
  const dur = leg.end - leg.start + 0.3, n = Math.round(dur * SR), i0 = Math.round(leg.start * SR);
  let low = 0, band = 0; const pan = k % 2 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const s = i / n, f = 250 + 2400 * s * s, q = 0.35;
    const F = 2 * Math.sin(Math.PI * f / SR);
    const x = rand() * 2 - 1;
    low += F * band; const high = x - low - q * band; band += F * high; // state-variable filter
    const env = Math.sin(Math.PI * clamp(s * 1.05)) ** 2 * 0.16;
    const p = pan * (s * 2 - 1) * 0.7;
    add(i0 + i, band * env * (1 - p) / 2 * 2, band * env * (1 + p) / 2 * 2);
  }
});

// 4) a bell per arrival (pentatonic, rising through the route)
const scale = [74, 76, 79, 81, 83, 86, 88, 91, 93];
ev.legs.forEach((leg, k) => {
  const f = hz(scale[k]), i0 = Math.round(leg.end * SR);
  for (let i = 0; i < 1.4 * SR; i++) {
    const t = i / SR, e = Math.exp(-t * 3.2) * Math.min(1, t * 400);
    const s = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6)) * e * 0.07;
    add(i0 + i, s * (k % 2 ? 0.8 : 1), s * (k % 2 ? 1 : 0.8));
  }
});
// the home cities' chips: four soft plucks
ev.chips.forEach((t0, k) => {
  const f = hz([62, 66, 69, 74][k]), i0 = Math.round(t0 * SR);
  for (let i = 0; i < 0.9 * SR; i++) { const t = i / SR, s = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 5) * Math.min(1, t * 300) * 0.06; add(i0 + i, s, s); }
});

// 5) the title hit: a low boom and a bright chord swell that rings to the end
{
  const i0 = Math.round(tTitle * SR), chord = [50, 57, 62, 66, 69, 74];
  for (let i = 0; i < N - i0; i++) {
    const t = i / SR;
    const boom = Math.sin(2 * Math.PI * (38 + 40 * Math.exp(-t * 12)) * t) * Math.exp(-t * 2.2) * 0.5;
    let sw = 0; chord.forEach((m, k) => { sw += Math.sin(2 * Math.PI * hz(m) * t + k) * (1 / (k + 1.5)); });
    const env = sfxOnly ? 0 : Math.min(1, t * 2.5) * Math.exp(-t * 0.35) * (1 - ramp(i0 / SR + t, cut.duration - 1.6, cut.duration)) * 0.07;
    add(i0 + i, boom + sw * env, boom + sw * env * 0.95);
  }
}

// a gentle fade in and out, 16-bit stereo
const pcm = Buffer.alloc(N * 4 + 44);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / SR, g = ramp(t, 0, 0.05) * (1 - ramp(t, cut.duration - 0.25, cut.duration));
  pcm.writeInt16LE(Math.round(clamp(Math.tanh(L[i] * g), -1, 1) * 32000), 44 + i * 4);
  pcm.writeInt16LE(Math.round(clamp(Math.tanh(R[i] * g), -1, 1) * 32000), 46 + i * 4);
}
writeFileSync(out, pcm);
console.log(`score ${cutId}: ${cut.duration}s → ${out}`);
