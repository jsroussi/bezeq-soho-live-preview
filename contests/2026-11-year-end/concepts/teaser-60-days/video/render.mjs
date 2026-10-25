// node render.mjs <outDir> [scale] [fps] [from] [to]   (AR=16x9 for the desktop version)  -> PNG frames f00000.png ... rendered from index.html
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [out, scale = '1', fps = '30', from, to] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const S = Number(scale), F = Number(fps);
const b = await chromium.launch();
const AR = process.env.AR || '9x16';
const [vw, vh] = AR === '16x9' ? [1920, 1080] : [1080, 1920];
const p = await b.newPage({ viewport: { width: vw * S, height: vh * S } });
p.on('pageerror', e => console.error('pageerror', e.message));
await p.goto(pathToFileURL(new URL('./index.html', import.meta.url).pathname).href + `?scale=${S}&ar=${AR}`);
await p.evaluate(() => window.ready);
const dur = await p.evaluate(() => window.DURATION);
const n0 = from ? Math.round(Number(from) * F) : 0, n1 = to ? Math.round(Number(to) * F) : Math.round(dur * F);
const canvas = await p.$('canvas');
for (let i = n0; i < n1; i++) {
  await p.evaluate(t => window.renderFrame(t), i / F);
  await canvas.screenshot({ path: `${out}/f${String(i).padStart(5, '0')}.png` });
}
await b.close();
console.log('frames', n0, '..', n1 - 1);
