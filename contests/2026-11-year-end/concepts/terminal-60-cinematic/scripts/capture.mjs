// Deterministic frame capture: a local static server, Chromium via Playwright with every non-local request
// blocked, one frame at a time through window.__setFrame, JPEG frames on disk for ffmpeg.
// usage: node scripts/capture.mjs --comp Main [--from 0] [--to N] [--step 1] [--workers 3] [--scale 2] [--out dir]
//        node scripts/capture.mjs --comp Main --hash 120,900,1700   (renders each frame 3× and compares hashes)
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const comp = arg('comp', 'Main');
const workers = Number(arg('workers', 3));
const step = Number(arg('step', 1));
const out = resolve(root, arg('out', `renders/tmp/${comp}`));
const hashList = arg('hash', '');
const query = arg('query', '') ? `&${arg('query', '')}` : ''; // e.g. noword (QA: the frame without the local word)
const EXE = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

const TYPES = { '.svg': 'image/svg+xml', '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.otf': 'font/otf', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(root, p === '/' ? 'dist/index.html' : p);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'max-age=3600' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: EXE, args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb', '--disable-gpu'] });
const probe = await browser.newPage();
await probe.goto(`${base}/dist/index.html?comp=${comp}`);
const cfg = await probe.evaluate(() => ({ w: window.__comp.width, h: window.__comp.height, n: window.__comp.durationInFrames, s: window.__comp.scale }));
await probe.close();
const scale = Number(arg('scale', cfg.s));

const openPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, deviceScaleFactor: scale });
  await ctx.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(`${base}/dist/index.html?comp=${comp}${query}`);
  return page;
};
const shot = async (page, f) => { await page.evaluate((x) => window.__setFrame(x), f); return page.screenshot({ type: 'jpeg', quality: 94, timeout: 180000, clip: { x: 0, y: 0, width: cfg.w, height: cfg.h } }); };

if (hashList) {
  const page = await openPage();
  const report = [];
  for (const f of hashList.split(',').map(Number)) {
    const hs = [];
    for (let k = 0; k < 3; k++) { await shot(page, Math.max(0, f - 7 + k)); hs.push(createHash('sha256').update(await shot(page, f)).digest('hex')); }
    report.push({ frame: f, hashes: hs, identical: hs.every((h) => h === hs[0]) });
  }
  console.log(JSON.stringify({ comp, scale, report }, null, 1));
  await browser.close(); server.close();
  process.exit(report.every((r) => r.identical) ? 0 : 1);
}

const from = Number(arg('from', 0)), to = Number(arg('to', cfg.n));
const frames = []; for (let f = from; f < to; f += step) frames.push(f);
mkdirSync(out, { recursive: true });
let done = 0; const t0 = Date.now();
const chunk = Math.ceil(frames.length / workers);
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const mine = frames.slice(w * chunk, (w + 1) * chunk);
  if (!mine.length) return;
  const page = await openPage();
  for (const f of mine) {
    writeFileSync(join(out, `f${String(f).padStart(5, '0')}.jpg`), await shot(page, f));
    if (++done % 60 === 0) console.log(`${comp}: ${done}/${frames.length} frames, ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
  }
}));
console.log(`${comp}: ${frames.length} frames → ${out} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close(); server.close();
