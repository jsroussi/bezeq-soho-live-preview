// node qa.mjs  — after render.mjs wrote build/9x16 and build/16x9 and ffmpeg encoded both MP4s (README).
// Measures every rendered frame and writes qa/: report.json, a contact sheet per format (one frame a second),
// ffprobe JSON per MP4. Exits 1 if a check fails.
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { DIR, ROOT, launch, openPage, grab } from './render.mjs';
import { contentBox, safeOk, logoCap, sixtyClearance, stopVisits, cityInk, signoffEvents, shieldBox, SAFE_9x16 } from './measure.mjs';

const BASE = process.env.QA_BASE || 'eff77cb';             // the commit holding the old MP4s (the music's reference)
const QA = resolve(DIR, 'qa'); mkdirSync(QA, { recursive: true });
const FMT = { '9x16': [1080, 1920], '16x9': [1920, 1080] };
const mp4 = (ar) => resolve(DIR, `teaser-60-days-${ar}.mp4`);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const pcm = (input) => sha(execFileSync('ffmpeg', ['-v', 'error', '-i', input, '-vn', '-f', 's16le', '-ac', '2', '-ar', '48000', '-'], { maxBuffer: 1 << 30 }));
const SHOTS = [[0, 8, 'open'], [8, 14, 'weeks'], [14, 18, 'tags'], [18, 20, 'pass'], [20, 24, 'sign-off']];
const shotOf = (t) => SHOTS.find(([a, b]) => t >= a && t < b)[2];
const report = { checks: {} }, fail = [];
const check = (name, ok, value) => { report.checks[name] = { ok, ...value }; if (!ok) fail.push(name); };

// every frame of a format, as raw RGB, one at a time
async function eachFrame(ar, fn) {
  const [w, h] = FMT[ar], size = w * h * 3, dir = resolve(DIR, 'build', ar);
  const n = readdirSync(dir).filter((f) => /^f\d{5}\.png$/.test(f)).length;
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', `${dir}/f%05d.png`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  let buf = Buffer.alloc(0), i = 0;
  for await (const chunk of ff.stdout) {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= size) { fn(i++, { data: buf.subarray(0, size), width: w, height: h, channels: 3 }); buf = buf.subarray(size); }
  }
  return { frames: i, expected: n };
}

// 1. 9:16 safe areas and the content's extent, per shot, on every rendered frame
for (const ar of Object.keys(FMT)) {
  const per = {}; let bad = [];
  const { frames, expected } = await eachFrame(ar, (i, f) => {
    const t = i / 30, box = contentBox(f), s = (per[shotOf(t)] ??= { top: Infinity, bottom: -Infinity });
    if (box) { s.top = Math.min(s.top, box[1]); s.bottom = Math.max(s.bottom, box[3]); }
    if (ar === '9x16' && !safeOk(box, f.height)) bad.push(i);
    if (i === 0) report[`frame0-${ar}`] = { box };
  });
  check(`frames-${ar}`, frames === 720 && expected === 720, { frames });
  report[`content-${ar}`] = per;
  if (ar === '9x16') check('safe-9x16', bad.length === 0, { rule: `content only in rows ${SAFE_9x16.top}–${1920 - SAFE_9x16.bottom - 1}`, perShot: per, badFrames: bad.slice(0, 20) });
}

// 2. pages: the logo's cap height (frame 0 and the end card), the 60 against the route, the route against the stops,
//    and determinism (three frames rendered twice in fresh browsers, compared with each other and the full render)
const stops = JSON.parse(readFileSync(resolve(ROOT, 'contests/2026-11-year-end/contest.json'), 'utf8')).journey.stops;
const { PNG } = createRequire(resolve(ROOT, 'contests/platform/package.json'))('pngjs');
const raw = (png) => { const p = PNG.sync.read(png); return { data: p.data, width: p.width, height: p.height, channels: 4 }; };
const HASH_T = [0, 1.5, 12, 20.5, 22.5, 23.9];
for (const ar of Object.keys(FMT)) {
  const runs = [];
  for (let r = 0; r < 2; r++) {
    const b = await launch(), p = await openPage(b, { ar });
    if (r === 0) {
      const boxes = await p.evaluate(() => window.logoBoxes());
      const caps = [await logoCap(raw(await grab(p, 0)), boxes[0]), ...await Promise.all([20.15, 20.5, 20.95].map(async (t) => logoCap(raw(await grab(p, t)), boxes[1])))];
      const need = ar === '9x16' ? 64 : 48;
      check(`logo-cap-${ar}`, caps.every((c) => c >= need), { frame0Px: caps[0], signoffPx: caps.slice(1), signoffAt: [20.15, 20.5, 20.95], need });
      // OT-2: the sign-off's events on the music's hits, the shield's size, centring and edges on the hold frames
      const ev = await signoffEvents(p);
      check(`signoff-events-${ar}`, Object.values(ev).every((e) => e.ok), ev);
      const E = await p.evaluate(() => window.endLayout()), holds = [];
      for (const t of [22.6, 22.9, 23.9]) holds.push({ t, ...shieldBox(raw(await grab(p, t)), E) });
      const maxW = ar === '9x16' ? 670 : Math.round(670 * 1080 / 1920);   // 16:9: the same share of the frame's height
      check(`shield-${ar}`, holds.every((h) => h.width <= maxW && Math.abs(h.dx) <= 2 && !h.clipped), { maxWidth: maxW, heightShare: +(holds[2].height / E.H).toFixed(4), holds });
      const sixty = await sixtyClearance(p, Array.from({ length: 240 }, (_, i) => i / 30));
      check(`sixty-vs-route-${ar}`, sixty.min > 0, { minGapPx: +sixty.min.toFixed(1), at: sixty.at });
      if (ar === '9x16') {
        const v = stopVisits(await p.evaluate(() => window.routePath(8)), stops);
        check('route-visits-stops', v.every((x) => x.ok), { visits: v });
      }
      // OT-3: the week tiles' city names (≥ 28 px at 9:16, ≥ 22 px at 16:9) and one tile per music tick, week 1 -> 9
      const rects = await p.evaluate(() => window.tileRects()), frame = raw(await grab(p, 13.5));
      const inks = rects.map((r) => cityInk(frame, r)), minInk = ar === '9x16' ? 28 : 22;
      check(`tile-cities-${ar}`, inks.every((x) => x >= minInk), { inkPx: inks, need: minInk, at: 13.5 });
      const pops = [];
      for (let i = 0; i < 9; i++) { let f = 240; while (!(await p.evaluate(([t, k]) => window.tileK(t, k) > 0, [f / 30, i]))) f++; pops.push(f); }
      const ticks = Array.from({ length: 9 }, (_, i) => (9 + i * 0.25) * 30);     // music.mjs: tick(T(4, 2) + i * BEAT / 2)
      check(`tile-ticks-${ar}`, pops.every((f, i) => Math.abs(f - ticks[i]) <= 1 && (i === 0 || f > pops[i - 1])), { firstFrames: pops, tickFrames: ticks });
    }
    const hashes = [];
    for (const t of HASH_T) hashes.push(sha(await grab(p, t)));
    runs.push(hashes); await b.close();
  }
  const full = HASH_T.map((t) => sha(readFileSync(resolve(DIR, 'build', ar, `f${String(Math.round(t * 30)).padStart(5, '0')}.png`))));
  check(`deterministic-${ar}`, runs[0].every((h, i) => h === runs[1][i] && h === full[i]), { times: HASH_T, run1: runs[0], run2: runs[1], fullRender: full });
}

// 3. the MP4s: ffprobe, 24.000 s at 30 fps, the music untouched (same decoded PCM as the old MP4s, music.mjs unchanged)
for (const ar of Object.keys(FMT)) {
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', mp4(ar)]));
  writeFileSync(resolve(QA, `ffprobe-${ar}.json`), JSON.stringify(probe, null, 2) + '\n');
  const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
  check(`mp4-${ar}`, +probe.format.duration === 24 && v.r_frame_rate === '30/1' && +v.nb_frames === 720 && [v.width, v.height].join('x') === FMT[ar].join('x'),
    { duration: probe.format.duration, fps: v.r_frame_rate, frames: v.nb_frames, size: `${v.width}x${v.height}`, audio: `${a.codec_name} ${a.sample_rate} Hz` });
  const old = resolve(DIR, 'build', `old-${ar}.mp4`);
  writeFileSync(old, execFileSync('git', ['show', `${BASE}:contests/2026-11-year-end/concepts/teaser-60-days/video/teaser-60-days-${ar}.mp4`], { cwd: ROOT, maxBuffer: 1 << 30 }));
  const [before, after] = [pcm(old), pcm(mp4(ar))];
  check(`audio-${ar}`, before === after, { oldPcmSha256: before, newPcmSha256: after });
}
let musicDiff = ''; try { execFileSync('git', ['diff', '--quiet', BASE, '--', 'contests/2026-11-year-end/concepts/teaser-60-days/video/music.mjs'], { cwd: ROOT }); } catch { musicDiff = 'changed'; }
check('music.mjs-unchanged', !musicDiff, { against: BASE });

const share = ['9x16', '16x9'].map((ar) => report.checks[`shield-${ar}`].heightShare);
check('shield-height-share', Math.abs(share[0] - share[1]) <= 0.005, { '9x16': share[0], '16x9': share[1] });

// 4. contact sheets: one frame a second (t = 0 … 23 s)
for (const ar of Object.keys(FMT)) {
  const [cols, w] = ar === '9x16' ? [8, 270] : [6, 384];
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4(ar), '-vf', `select='not(mod(n\\,30))',scale=${w}:-1,tile=${cols}x${24 / cols}`, '-frames:v', '1', '-q:v', '3', resolve(QA, `contact-${ar}.jpg`)]);
}

writeFileSync(resolve(QA, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.checks).map(([k, v]) => [k, v.ok])), null, 1));
if (fail.length) { console.error('FAILED:', fail.join(', ')); process.exit(1); }
