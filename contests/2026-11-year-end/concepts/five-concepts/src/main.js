// The concepts demo: one Bezeq shell, the nine weeks from weeks.js, five ways to stage them. The menu at the bottom
// switches concept, week and peak day. URL: #c=<concept>&w=<week number>&peak=1, plus still=1 (no motion) and console=0.
import gsap from 'gsap';
import css from './styles.css';
import fontCss from './fonts.js';
import { prepareWeeks, tokens, applyTokens } from './theme.js';
import { topBar, credits } from './shell.js';
import { createGlobe } from './globe.js';
import { h } from './dom.js';
import hall from './concepts/hall.js';
import edition from './concepts/edition.js';
import windowC from './concepts/window.js';
import atlas from './concepts/atlas.js';
import golden from './concepts/golden.js';

const CONCEPTS = [hall, edition, windowC, atlas, golden];
gsap.ticker.lagSmoothing(0); // on a slow PC a flight skips frames but still lands on time
const readHash = () => Object.fromEntries(location.hash.slice(1).split('&').filter(Boolean).map((kv) => kv.split('=')));

// Without WebGL (some phones' in-app viewers) every concept still works; the globe simply is not drawn.
function noGlobe() {
  const done = () => gsap.timeline().to({}, { duration: 0.01 });
  return { FRAMES: {}, setLook() {}, setGrade() {}, setAtlasColors() {}, setRoute() {}, legProgress() {}, showColumns() {}, flyTo: done, frameNow() {}, project: () => [innerWidth * 0.3, innerHeight * 0.5], resize() {}, set offset(v) {}, start() {}, stop() {}, render() {} };
}

(async () => {
  document.head.append(h('style', {}, fontCss + '\n' + css));
  const contest = window.CONTEST, weeks = prepareWeeks(window.WEEKS, contest), P = readHash();
  const still = P.still === '1';
  if (still) document.documentElement.dataset.still = '1';
  if (P.console === '0') document.documentElement.dataset.console = '0';
  const state = { c: Math.max(0, CONCEPTS.findIndex((c) => c.id === P.c)), w: Math.max(0, Math.min(weeks.length - 1, (Number(P.w) || 1) - 1)), peak: P.peak === '1', mounted: null };

  const canvas = h('canvas', { id: 'gl', 'aria-hidden': 'true' }), backdrop = h('div', { id: 'backdrop' }), root = h('main', { id: 'stage-root' });
  document.body.append(backdrop, canvas, topBar(contest), root, credits(weeks));
  await Promise.all(['400 20px Simpler', '700 20px Simpler', '900 20px Simpler'].map((f) => document.fonts.load(f, 'אבג')));
  const globe = await createGlobe(canvas).catch(() => noGlobe());
  const ctx = { weeks, contest, globe, canvas, backdrop, root };
  // While a transition runs, clicks wait; data-busy lets the tests wait for the same moment.
  let busy = false;
  const setBusy = (v) => { busy = v; document.documentElement.dataset.busy = v ? '1' : ''; };

  const writeHash = () => history.replaceState(null, '', `#c=${CONCEPTS[state.c].id}&w=${state.w + 1}${state.peak ? '&peak=1' : ''}${still ? '&still=1' : ''}${P.console === '0' ? '&console=0' : ''}`);
  function mountConcept(i) {
    state.mounted?.unmount(ctx);
    state.c = i; const c = CONCEPTS[i]; state.mounted = c;
    document.body.dataset.concept = c.id; scrollTo(0, 0);
    applyTokens(tokens(weeks[state.w], state.peak));
    c.mount(ctx, weeks[state.w], state.peak);
    c.show(ctx, weeks[state.w], { peak: state.peak, instant: still });
    sync(); writeHash();
  }
  async function goWeek(i) {
    if (busy || i === state.w) { sync(); return; }
    setBusy(true); const from = weeks[state.w], to = weeks[i];
    state.w = i; state.peak = false; sync(); writeHash();
    try { await CONCEPTS[state.c].travel(ctx, from, to); } finally { setBusy(false); }
  }
  async function togglePeak() {
    if (busy) return;
    setBusy(true); state.peak = !state.peak; sync(); writeHash();
    applyTokens(tokens(weeks[state.w], state.peak), 1.2);
    try { await CONCEPTS[state.c].peak(ctx, weeks[state.w], state.peak); } finally { setBusy(false); }
  }
  async function replay() {
    if (busy) return;
    setBusy(true); state.peak = false; sync(); writeHash();
    const to = weeks[state.w], from = weeks[Math.max(0, state.w - 1)] === to ? weeks[weeks.length - 1] : weeks[Math.max(0, state.w - 1)];
    applyTokens(tokens(to));
    try { await CONCEPTS[state.c].travel(ctx, from, to); } finally { setBusy(false); }
  }

  // The demo menu. Not part of the design: it lets you pick a concept, a week and the peak day. On small screens the
  // nine week buttons become one list.
  let sel, wk, wkSel, pk;
  const menu = h('div', { class: 'demo', role: 'toolbar', 'aria-label': 'תפריט הדמו' },
    h('span', { class: 'tag' }, 'דמו'),
    sel = h('select', { 'aria-label': 'קונספט', onchange: (e) => mountConcept(Number(e.target.value)) }, CONCEPTS.map((c, i) => h('option', { value: i }, `קונספט ${i + 1}: ${c.name}`))),
    wk = h('div', { class: 'wk' }, weeks.map((w, i) => h('button', { type: 'button', title: `${w.country} · ${w.datesShort}`, onclick: () => goWeek(i) }, `${w.order} ${w.city}`))),
    wkSel = h('select', { class: 'wk-sel', 'aria-label': 'שבוע', onchange: (e) => goWeek(Number(e.target.value)) }, weeks.map((w, i) => h('option', { value: i }, `שבוע ${w.order}: ${w.city}`))),
    pk = h('button', { type: 'button', class: 'pk', onclick: togglePeak }, 'יום שיא'),
    h('button', { type: 'button', class: 'rp', title: 'להפעיל שוב את המעבר', 'aria-label': 'להפעיל שוב את המעבר', onclick: replay }, '↺'));
  document.body.append(menu);
  function sync() { sel.value = String(state.c); wkSel.value = String(state.w); [...wk.children].forEach((b, i) => b.classList.toggle('on', i === state.w)); pk.classList.toggle('on', state.peak); }
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, select')) return;
    if (e.key === 'ArrowLeft') goWeek(Math.min(weeks.length - 1, state.w + 1));
    if (e.key === 'ArrowRight') goWeek(Math.max(0, state.w - 1));
    if (e.key === 'p' || e.key === 'פ') togglePeak();
  });

  // A new size or orientation re-fits the titles and re-places what hangs on the globe.
  let raf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => state.mounted?.layout?.(ctx)); });

  mountConcept(state.c);
  requestAnimationFrame(() => requestAnimationFrame(() => { document.documentElement.dataset.ready = '1'; }));
})();
