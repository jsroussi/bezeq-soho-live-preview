// node render.mjs <outDir> [scale] [fps] [from] [to]   (AR=16x9 for the desktop version)  -> PNG frames f00000.png ... rendered from index.html
// The page is served from the repository (offline: any other request is aborted) and gets the contest's data from
// contest.json, reduced to what the teaser shows (teaserData). Headless Chromium with software WebGL and a CPU,
// single-thread raster (T2's flags), so a frame renders bit-identically whatever was rendered before it.
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const DIR = resolve(fileURLToPath(new URL('.', import.meta.url)));
export const ROOT = resolve(DIR, '../../../../..');
const REL = DIR.slice(ROOT.length + 1), HOST = 'http://teaser.local';
export const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb',
  '--font-render-hinting=none', '--disable-lcd-text', '--disable-font-subpixel-positioning', '--disable-skia-runtime-opts', '--enable-webgl',
  '--disable-gpu-rasterization', '--num-raster-threads=1', '--disable-partial-raster', '--disable-threaded-animation', '--disable-checker-imaging'];

// What the teaser reads from contest.json: the name, the first day, the nine stops (only their city, country, place and
// dates: no prize, peak, photo or landmark can reach a frame), the origin (boardingPass.home) and the approved prize line.
export function teaserData() {
  const c = JSON.parse(readFileSync(resolve(ROOT, 'contests/2026-11-year-end/contest.json'), 'utf8'));
  const code = c.boardingPass.home.fallback;
  return {
    name: c.name, start: c.period.start, stops: c.journey.stops.map(({ he, country, ll, start, end }) => ({ he, country, ll, start, end })),
    home: { code, he: c.boardingPass.cities[code] }, prizesTeaser: c.prizes.teaser,
    boardingPass: { home: { fallback: code }, cities: { [code]: c.boardingPass.cities[code] } },
  };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.otf': 'font/otf' };

export async function launch() {
  const { chromium } = createRequire(import.meta.url)('playwright');
  return chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ARGS });
}

export async function openPage(browser, { ar = '9x16', scale = 1 } = {}) {
  const [vw, vh] = ar === '16x9' ? [1920, 1080] : [1080, 1920];
  const page = await browser.newPage({ viewport: { width: vw * scale, height: vh * scale }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== HOST) { errors.push(`blocked ${url.href}`); return route.abort('blockedbyclient'); }
    if (url.pathname === '/__teaser/data.json') return route.fulfill({ status: 200, contentType: TYPES['.json'], body: JSON.stringify(teaserData()) });
    const file = resolve(ROOT, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT + '/') || !existsSync(file)) { errors.push(`404 ${url.pathname}`); return route.fulfill({ status: 404, body: '' }); }
    return route.fulfill({ status: 200, contentType: TYPES[extname(file)] || 'application/octet-stream', body: readFileSync(file) });
  });
  await page.goto(`${HOST}/${REL}/index.html?scale=${scale}&ar=${ar}`);
  await page.waitForFunction(() => window.ready === true || window.__failed, null, { timeout: 120000 }).catch(() => {});
  if (errors.length) throw new Error(errors.join('\n'));
  if (!(await page.evaluate(() => window.fontsOk))) throw new Error('Simpler did not load');
  return page;
}

// Renders moment t and returns the PNG (the viewport: the canvases and the pass). Two animation frames pass before the
// capture, so every layer (a canvas just cleared included) is composited: without it a frame could show the last one's.
export async function grab(page, t, path) {
  await page.evaluate((x) => { window.renderFrame(x); return new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))); }, t);
  return page.screenshot({ path, animations: 'disabled', caret: 'hide' });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [out, scale = '1', fps = '30', from, to] = process.argv.slice(2);
  mkdirSync(out, { recursive: true });
  const S = Number(scale), F = Number(fps);
  const browser = await launch();
  const page = await openPage(browser, { ar: process.env.AR || '9x16', scale: S });
  const dur = await page.evaluate(() => window.DURATION);
  const n0 = from ? Math.round(Number(from) * F) : 0, n1 = to ? Math.round(Number(to) * F) : Math.round(dur * F);
  for (let i = n0; i < n1; i++) await grab(page, i / F, `${out}/f${String(i).padStart(5, '0')}.png`);
  await browser.close();
  console.log('frames', n0, '..', n1 - 1);
}
