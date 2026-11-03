// QA for the rendered cuts (run after scripts/render.mjs all):
// - determinism: three master frames rendered twice more in fresh browsers, compared with each other and with the full
//   render (sha256, else the share of differing pixels; must be ≤ 1 %);
// - ffprobe and EBU R128 loudness of each MP4; a contact sheet every 2 s; the posters;
// - the order check: the four home cities, then the nine stops in contest.json order, each with its IATA code.
// Writes qa/ (committed). node scripts/qa.mjs
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DIR, BUILD, OUT, CUTS, launch, buildData, CHROMIUM_ARGS, renderBand, openTeaser } from './lib.mjs';
import { renderFrames } from './render.mjs';
import { legs } from '../src/timeline.js';

const QA = join(DIR, 'qa'); mkdirSync(QA, { recursive: true });
const NAMES = { master: 'teaser-sphere-globe-16x9.mp4', vertical: 'teaser-sphere-globe-9x16.mp4', whatsapp: 'teaser-sphere-globe-whatsapp-15s.mp4' };
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const run = (cmd, a) => { const r = spawnSync(cmd, a, { cwd: DIR, encoding: 'utf8', maxBuffer: 64e6 }); return r.stdout + r.stderr; }; // ffmpeg reports on stderr
const report = { date: new Date().toISOString().slice(0, 10) };

// 1) determinism
const FRAMES = [90, 420, 900];
const runs = [];
for (const k of [1, 2]) {
  const dir = join(BUILD, `qa-run${k}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  runs.push({ dir, env: await renderFrames('master', FRAMES, dir) });
}
const browser = await launch(), page = await browser.newPage();
async function diff(a, b) {
  if (sha(a) === sha(b)) return 0;
  return page.evaluate(async ([x, y]) => {
    const img = async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height), g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const [p, q] = [await img(x), await img(y)]; let n = 0;
    for (let i = 0; i < p.length; i += 4) if (p[i] !== q[i] || p[i + 1] !== q[i + 1] || p[i + 2] !== q[i + 2]) n++;
    return n / (p.length / 4);
  }, [a, b].map((f) => 'data:image/png;base64,' + readFileSync(f).toString('base64')));
}
report.determinism = [];
for (const f of FRAMES) {
  const name = `${String(f).padStart(5, '0')}.png`, a = join(runs[0].dir, name), b = join(runs[1].dir, name), full = join(BUILD, 'master/frames', name);
  const row = { frame: f, t: f / 30, run1: sha(a), run2: sha(b), runVsRun: await diff(a, b) };
  if (existsSync(full)) { row.fullRender = sha(full); row.runVsFull = await diff(a, full); }
  row.pass = row.runVsRun <= 0.01 && (row.runVsFull ?? 0) <= 0.01;
  report.determinism.push(row);
}
await browser.close();
report.renderEnv = { ...runs[0].env, chromiumArgs: CHROMIUM_ARGS, node: process.version, ffmpeg: run('ffmpeg', ['-version']).split('\n')[0] };

// 2) per cut: ffprobe, loudness, contact sheet, posters
const font = ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].find(existsSync);
report.cuts = {};
for (const [id, cut] of Object.entries(CUTS)) {
  const mp4 = join(OUT, NAMES[id]);
  if (!existsSync(mp4)) continue;
  writeFileSync(join(QA, `ffprobe-${id}.txt`), run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', mp4]));
  const r128 = run('ffmpeg', ['-hide_banner', '-nostats', '-i', mp4, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const summary = r128.slice(r128.lastIndexOf('Summary:'));
  writeFileSync(join(QA, `loudness-${id}.txt`), summary.trim() + '\n');
  const I = +summary.match(/I:\s+(-?[\d.]+) LUFS/)[1], TP = +summary.match(/Peak:\s+(-?[\d.]+) dBFS/)[1];
  const probe = JSON.parse(readFileSync(join(QA, `ffprobe-${id}.txt`), 'utf8'));
  const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
  report.cuts[id] = { file: `out/${NAMES[id]}`, bytes: +probe.format.size, duration: +probe.format.duration, video: `${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate} ${v.pix_fmt}`, audio: `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch`, lufs: I, truePeak: TP,
    loudnessOk: Math.abs(I + 16) <= 1 && TP <= -1 };
  const tall = cut.h > cut.w, tw = tall ? 270 : 480, th = tall ? 480 : 270, n = Math.ceil(cut.duration / 2), cols = tall ? 5 : 4;
  const label = font ? `,drawtext=fontfile=${font}:text='%{pts\\:hms}':x=8:y=8:fontsize=${tall ? 18 : 18}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4` : '';
  run('ffmpeg', ['-hide_banner', '-y', '-i', mp4, '-vf', `fps=1/2,setpts=N*2/TB,scale=${tw}:${th}${label},tile=${cols}x${Math.ceil(n / cols)}:padding=6:color=0x101010`, '-frames:v', '1', '-q:v', '3', join(QA, `contact-sheet-${id}.jpg`)]);
  const posterT = { master: 30, vertical: 19, whatsapp: 14 }[id];
  run('ffmpeg', ['-hide_banner', '-y', '-ss', String(posterT), '-i', mp4, '-frames:v', '1', '-q:v', '2', join(QA, `poster-${id}.jpg`)]);
}

// 3) the end card (Simpler 700 cap height 0.54 em): "בזק" ≥ 64 px tall in 9:16, ≥ 48 px in 16:9; 9:16 bottom 300 px clear.
//    And the first frame is not black (it becomes the WhatsApp thumbnail): its mean luma, 0–255.
{
  const b = await launch(), band = await renderBand(b);
  for (const [id, cut] of Object.entries(CUTS)) {
    const page = await openTeaser(b, id, band, []);
    await page.evaluate((t) => window.teaser.frame(t), cut.duration - 0.1);
    const end = await page.evaluate(() => { const m = document.getElementById('title-mark'), t = document.getElementById('title').getBoundingClientRect();
      return { markCapPx: +(parseFloat(getComputedStyle(m).fontSize) * 0.54).toFixed(1), titleBottom: Math.round(t.bottom) }; });
    await page.close();
    const mp4 = join(OUT, NAMES[id]);
    const luma = existsSync(mp4) ? +run('ffmpeg', ['-hide_banner', '-i', mp4, '-vf', 'select=eq(n\\,0),signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-frames:v', '1', '-f', 'null', '-']).match(/YAVG=([\d.]+)/)[1] : null;
    const tall = cut.h > cut.w;
    report.cuts[id] = { ...report.cuts[id], endCard: { ...end, ok: end.markCapPx >= (tall ? 64 : 48) && (!tall || end.titleBottom <= cut.h - cut.safe.bottom) }, firstFrameLuma: luma, firstFrameNotBlack: luma > 16 };
  }
  await b.close();
}

// 4) order: homes by chip time, stops by arrival
const D = buildData('master'), L = legs(D.cut, D.stops);
report.order = {
  homes: D.homes.map((h, i) => ({ city: h.he, at: +(D.cut.open.chipsAt + i * D.cut.open.chipStep).toFixed(2) })),
  stops: D.stops.map((s, i) => ({ week: i + 1, country: s.country, city: s.city, iata: s.iata, arrives: +L[i].end.toFixed(2) })),
};
report.order.inOrder = report.order.stops.every((s, i, a) => !i || s.arrives > a[i - 1].arrives);
writeFileSync(join(QA, 'qa-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ determinism: report.determinism.map((d) => [d.frame, d.runVsRun, d.runVsFull, d.pass]), cuts: report.cuts, inOrder: report.order.inOrder }, null, 2));
