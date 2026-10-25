// node music.mjs out.wav  -> 24 s stereo soundtrack, synthesized in code.
// Same grid as index.html: 120 BPM, 2 s per bar, 12 bars. Every hit below sits on a moment in the picture.
import { writeFileSync } from 'node:fs';

const SR = 44100, BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT;
const T = (bar, beat = 0) => bar * BAR + beat * BEAT;
const DUR = T(12), N = Math.ceil(DUR * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const FX = new Float32Array(N);                       // reverb send (mono)

let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const mtof = m => 440 * 2 ** ((m - 69) / 12);
function add(t0, len, fn, { gain = 1, pan = 0, send = 0 } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n && i0 + i < N; i++) {
    if (i0 + i < 0) continue;
    const v = fn(i / SR, i / n);
    L[i0 + i] += v * gl; R[i0 + i] += v * gr; FX[i0 + i] += v * send;
  }
}

// ---------- instruments ----------
const kick = t => add(t, 0.4, (s) => Math.sin(2 * Math.PI * (45 * s + 90 * (1 - Math.exp(-s * 30)) / 30)) * Math.exp(-s * 9) * 0.95);
const hat = (t, g = 0.16) => add(t, 0.06, (s) => rnd() * Math.exp(-s * 70), { gain: g, pan: 0.3 });
function clap(t) {
  let lp = 0;
  add(t, 0.25, (s) => { lp += 0.5 * (rnd() - lp); const env = Math.exp(-s * 18) * (s < 0.03 ? (Math.floor(s * 100) % 1 === 0 ? 1 : 1) : 1); return (rnd() - lp) * env; }, { gain: 0.32, pan: -0.1, send: 0.25 });
}
function bass(t, midi, len) {
  const f = mtof(midi); let lp = 0;
  add(t, len, (s, u) => { const saw = 2 * ((f * s) % 1) - 1; lp += 0.08 * (saw - lp); return lp * Math.min(1, s * 200) * (1 - u) ** 0.5; }, { gain: 0.55 });
}
function pluck(t, midi, { gain = 0.16, pan = 0, len = 0.5 } = {}) {
  const f = mtof(midi);
  add(t, len, (s) => (Math.sin(2 * Math.PI * f * s) + 0.35 * Math.sin(4 * Math.PI * f * s) + 0.15 * Math.sin(6 * Math.PI * f * s)) * Math.exp(-s * 7) * Math.min(1, s * 400), { gain, pan, send: 0.35 });
}
function pad(t, midis, len, gain = 0.05) {
  midis.forEach((m, k) => {
    const f = mtof(m);
    add(t, len, (s, u) => {
      const env = Math.min(1, s / 0.4) * Math.min(1, (1 - u) * len / 0.3);
      return (Math.sin(2 * Math.PI * f * s) + Math.sin(2 * Math.PI * f * 1.004 * s) * 0.7) * env;
    }, { gain, pan: k % 2 ? 0.4 : -0.4, send: 0.5 });
  });
}
function whoosh(tHit, len = 0.6, gain = 0.28) {               // rising filtered noise that peaks on tHit
  let lp = 0;
  add(tHit - len, len + 0.08, (s, u) => { const k = 0.02 + 0.5 * u * u; lp += k * (rnd() - lp); return lp * u * u * (u > 0.93 ? (1 - u) / 0.07 : 1); }, { gain, send: 0.3 });
}
function boom(t) {                                            // "60" land / stamp slam: sub drop + noise crack
  add(t, 1.2, (s) => Math.sin(2 * Math.PI * (38 * s + 120 * (1 - Math.exp(-s * 12)) / 12)) * Math.exp(-s * 3.2), { gain: 0.9 });
  add(t, 0.5, (s) => rnd() * Math.exp(-s * 14), { gain: 0.22, send: 0.6 });
}
function tick(t, midi) {                                      // passport stamp pop
  const f = mtof(midi);
  add(t, 0.12, (s) => Math.sin(2 * Math.PI * f * s) * Math.exp(-s * 40), { gain: 0.32, pan: 0.2, send: 0.2 });
  add(t, 0.03, (s) => rnd() * Math.exp(-s * 160), { gain: 0.25 });
}
function chime(t) {
  [84, 88, 91, 96].forEach((m, k) => pluck(t + k * 0.06, m, { gain: 0.12, pan: k % 2 ? 0.5 : -0.5, len: 1.6 }));
}

// ---------- arrangement (D major: D - Bm - G - A, one chord per bar) ----------
const CH = [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]];
const ROOT = [38, 35, 31, 33];
const ARP = [[74, 78, 81, 78, 86, 81, 78, 81], [71, 74, 78, 74, 83, 78, 74, 78], [67, 71, 74, 71, 79, 74, 71, 74], [69, 73, 76, 73, 81, 76, 73, 76]];

for (let bar = 0; bar < 12; bar++) {
  const c = bar % 4, t0 = T(bar);
  pad(t0, CH[c], BAR + 0.05, bar < 1 ? 0.035 : 0.045);
  if (bar >= 1 && bar < 12) {
    for (let b = 0; b < 4; b++) kick(T(bar, b));
    for (let b = 0; b < 4; b++) hat(T(bar, b + 0.5));
    for (let b = 0; b < 4; b++) bass(T(bar, b + 0.5), ROOT[c] + (b === 3 ? 7 : 0), BEAT * 0.45);
  }
  if (bar >= 2) { clap(T(bar, 1)); clap(T(bar, 3)); }
  if (bar >= 2 && bar !== 4 && bar !== 7 && bar !== 10) ARP[c].forEach((m, k) => pluck(T(bar, k / 2), m, { pan: k % 2 ? 0.35 : -0.35 }));
}
// intro: plane flight
whoosh(T(1), 1.6, 0.22);
boom(T(1));                                  // "60" lands
whoosh(T(4), 0.5); whoosh(T(7), 0.5); whoosh(T(10), 0.5);   // into each cut
for (let i = 0; i < 9; i++) tick(T(4, 2) + i * BEAT / 2, 76 + [0, 2, 4, 5, 7, 9, 11, 12, 14][i]);   // 9 stamps
for (let i = 0; i < 6; i++) whoosh(T(7, 2) + i * BEAT, 0.22, 0.14);                                  // 6 tags swing in
boom(T(11));                                 // boarding stamp slams
chime(T(11, 2));                             // logo lands
pad(T(11, 2), [62, 66, 69, 74], 1.0, 0.05);  // final chord rings

// ---------- reverb (two feedback delays), master, fade ----------
const d1 = Math.floor(0.113 * SR), d2 = Math.floor(0.167 * SR);
const b1 = new Float32Array(N), b2 = new Float32Array(N);
for (let i = 0; i < N; i++) {
  b1[i] = FX[i] + (i >= d1 ? b1[i - d1] * 0.45 : 0);
  b2[i] = FX[i] + (i >= d2 ? b2[i - d2] * 0.42 : 0);
  L[i] += b1[i] * 0.28; R[i] += b2[i] * 0.28;
}
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak, fadeN = Math.floor(0.45 * SR);
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const f = i > N - fadeN ? (N - i) / fadeN : 1;
  const soft = x => Math.tanh(x * g * f * 1.1) / Math.tanh(1.1);
  buf.writeInt16LE(Math.round(soft(L[i]) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(soft(R[i]) * 32767), 46 + i * 4);
}
writeFileSync(process.argv[2] || 'music.wav', buf);
console.log('wrote', DUR, 's');
