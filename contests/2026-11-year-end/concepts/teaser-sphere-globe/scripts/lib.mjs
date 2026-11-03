// Shared by the render, QA and preview scripts: the page's data (contest.json + teaser.config.js), an offline file
// server for the repository, and the pinned headless Chromium with an explicit WebGL backend.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { CUTS, HOMES, IATA, BAND, TITLE, PALETTE, OPENING } from '../teaser.config.js';

export const DIR = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const ROOT = resolve(DIR, '../../../..');
export const REL = DIR.slice(ROOT.length + 1); // contests/2026-11-year-end/concepts/teaser-sphere-globe
export const HOST = 'http://teaser.local';
export const BUILD = join(DIR, 'build');
export const OUT = join(DIR, 'out');
export { CUTS };

// SwiftShader through ANGLE: a software WebGL backend, the same pixels on every machine with this Chromium build.
export const CHROMIUM_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none', '--disable-background-timer-throttling'];

export async function launch() {
  const { chromium } = createRequire(import.meta.url)('playwright');
  return chromium.launch({ args: CHROMIUM_ARGS });
}

export function openingFrames(cutId) {
  const dir = join(DIR, OPENING.dirs[cutId]);
  if (!existsSync(dir)) return null;
  const all = readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (!all.length) return null;
  const keep = Math.round(CUTS[cutId].open.end * OPENING.fps); // the LAST seconds of the zoom-out, ending over Israel
  return all.slice(-keep).map((f) => `/${REL}/${OPENING.dirs[cutId]}/${f}`);
}

export function buildData(cutId, band = {}) {
  const contest = JSON.parse(readFileSync(join(ROOT, 'contests/2026-11-year-end/contest.json'), 'utf8'));
  const stops = contest.journey.stops.map((s) => ({ id: s.id, city: s.he, country: s.country, ll: s.ll, accent: s.accent, iata: IATA[s.id] }));
  if (stops.length !== 9 || stops.some((s) => !s.iata)) throw new Error('expected the nine stops of contest.json, each with an IATA code');
  const frames = openingFrames(cutId);
  return {
    cut: CUTS[cutId], stops, homes: HOMES, palette: PALETTE, band: BAND, title: TITLE,
    bandUrl: '/__teaser/band.png', bandAspect: band.aspect ?? 40,
    opening: frames ? { frames, fps: OPENING.fps, fade: OPENING.fade, attribution: OPENING.attribution } : null,
  };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.otf': 'font/otf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

// A request path → { status, body, contentType }. Only files under the repository; nothing else exists.
export function serve(path, cutId, band) {
  if (path === '/__teaser/data.json') return { status: 200, contentType: TYPES['.json'], body: JSON.stringify(buildData(cutId, band)) };
  if (path === '/__teaser/band.png') path = `/${REL}/build/band.png`;
  const file = resolve(ROOT, '.' + decodeURIComponent(path));
  if (!file.startsWith(ROOT + '/') || !existsSync(file)) return { status: 404, contentType: 'text/plain', body: 'not found' };
  return { status: 200, contentType: TYPES[extname(file).toLowerCase()] || 'application/octet-stream', body: readFileSync(file) };
}

// Every request from the page is answered from disk or aborted: no network during capture.
export async function offline(page, cutId, band, blocked = []) {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== HOST) { blocked.push(url.href); return route.abort('blockedbyclient'); }
    const r = serve(url.pathname, new URLSearchParams(url.search).get('cut') || cutId, band);
    return route.fulfill({ status: r.status, contentType: r.contentType, body: r.body });
  });
  return blocked;
}

export const pageUrl = (cutId, t = 0) => `${HOST}/${REL}/src/index.html?cut=${cutId}&t=${t}`;

export async function openTeaser(browser, cutId, band, blocked) {
  const cut = CUTS[cutId];
  const page = await browser.newPage({ viewport: { width: cut.w, height: cut.h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await offline(page, cutId, band, blocked);
  await page.goto(pageUrl(cutId));
  await page.waitForFunction(() => window.teaserReady === true, null, { timeout: 120000 });
  return page;
}

export async function renderBand(browser) {
  const page = await browser.newPage({ viewport: { width: 6000, height: 200 }, deviceScaleFactor: 1 });
  await offline(page, 'master', {});
  await page.goto(`${HOST}/${REL}/src/band.html`);
  await page.waitForFunction(() => window.bandReady === true);
  if (!(await page.evaluate(() => window.bandOk))) throw new Error('Simpler did not load for the band');
  const el = await page.$('#band'), box = await el.boundingBox();
  const { mkdirSync } = await import('node:fs'); mkdirSync(BUILD, { recursive: true });
  await el.screenshot({ path: join(BUILD, 'band.png'), omitBackground: true });
  await page.close();
  return { aspect: box.width / box.height, width: Math.round(box.width), height: Math.round(box.height) };
}
