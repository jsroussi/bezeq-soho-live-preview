// Clicks through every concept the way a person would: next week, peak day on and off, replay, back to week 1.
// Waits for each transition to finish (data-busy) and reports how long it took, and any errors.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 969 } }), errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !m.text().includes('ERR_FILE_NOT_FOUND') && errs.push(m.text()));
await p.goto(`file://${process.cwd()}/index.html#c=hall&w=1`);
await p.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 120000 });
const idle = () => p.waitForFunction(() => document.documentElement.dataset.busy !== '1', null, { timeout: 30000 });
async function step(name, act) { const t = Date.now(); await act(); await p.waitForTimeout(100); await idle(); return `${name} ${((Date.now() - t) / 1000).toFixed(1)}s`; }
for (let c = 0; c < 5; c++) {
  await p.selectOption('.demo select', String(c)); await p.waitForTimeout(1200);
  const log = [
    await step('week 2', () => p.click('.demo .wk button:nth-child(2)')),
    await step('peak on', () => p.click('.demo .pk')),
    await step('peak off', () => p.click('.demo .pk')),
    await step('replay', () => p.click('.demo .rp')),
    await step('week 1', () => p.click('.demo .wk button:nth-child(1)')),
  ];
  const hash = await p.evaluate(() => location.hash);
  console.log('concept', c, hash, log.join(', '), errs.length ? errs.splice(0) : 'ok');
}
await p.screenshot({ path: 'shots/console.png' });
await b.close();
