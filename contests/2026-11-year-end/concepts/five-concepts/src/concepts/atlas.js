// Concept 4, the living atlas: Bezeq navy as the atlas, the land as cream dots, the legs already travelled as lit
// arcs. The week's country rises out of the globe in its own colours; on a peak day the camera descends into it.
import gsap from 'gsap';
import { h, ltr, fit, tall, gut } from '../dom.js';
import { statusCard, instrumentPanel, prizeCard } from '../shell.js';
import { arrive, reduced } from '../motion.js';
import { applyTokens, tokens } from '../theme.js';

let el = {};

// On a peak day the prize card hangs beside the city on the globe, kept clear of the copy and inside the stage.
// On portrait screens the stylesheet sets it under the globe instead.
function placePrize(ctx, week) {
  if (tall()) { Object.assign(el.prize.style, { left: '', top: '' }); return; }
  const [x, y] = ctx.globe.project(week, 1.16), r = el.atlas.getBoundingClientRect(), g = gut();
  const w = el.prize.offsetWidth, hh = el.prize.offsetHeight, right = el.copy.offsetLeft - 24;
  const left = Math.max(g, Math.min(x - r.left + 48, right - w)), top = Math.max(g, Math.min(y - r.top - 120, r.height - hh - g));
  Object.assign(el.prize.style, { left: `${Math.round(left)}px`, top: `${Math.round(top)}px` });
}

export default {
  id: 'atlas', name: 'האטלס החי', en: 'The Living Atlas', look: 'atlas',
  mount(ctx, week, peak) {
    el = {};
    el.root = h('div', { class: 'c-atlas' },
      el.atlas = h('section', { class: 'atlas stage' },
        h('div', { class: 'atlas-rules', 'aria-hidden': 'true' }),
        el.copy = h('div', { class: 'atlas-copy' }),
        h('p', { class: 'atlas-legend' }, h('span', {}, 'הדרך שעשינו'), h('span', { class: 'ahead' }, 'הדרך שלפנינו')),
        el.prize = h('div', { class: 'prize-anchor' })),
      el.panel = instrumentPanel(week, ctx.weeks.length, { peak }));
    ctx.root.append(el.root);
    ctx.backdrop.style.background = 'var(--navy)';
    ctx.canvas.classList.add('bg'); ctx.globe.setLook('atlas'); ctx.globe.start();
  },
  layout(ctx) {
    fit(el.copy.querySelector('h1'), { w: el.copy.clientWidth, h: el.atlas.clientHeight * (tall() ? 0.12 : 0.17) });
    if (this.week) placePrize(ctx, this.week);
  },
  show(ctx, week, { peak = false, instant = false } = {}) {
    this.week = week;
    const g = ctx.globe, t = tokens(week, peak);
    g.setLook('atlas'); g.setAtlasColors(week, peak); g.setRoute(ctx.weeks, week.index, t['--w-accent'], 'atlas');
    g.showColumns(week, peak ? week.peakDay.palette : week.palette, { instant, ring: peak ? 1 : 0, accent: t['--w-accent'] }); g.frameNow(week, peak ? 'atlasPeak' : 'atlas');
    el.copy.replaceChildren(
      h('p', { class: 'leg' }, peak ? ['יום שיא · היום עד ', ltr('23:59')] : `שבוע ${week.order} מתוך ${ctx.weeks.length} · ${week.datesLong}`),
      h('h1', {}, week.country), h('p', { class: 'city' }, peak ? (week.peakDay.theme ?? 'יום שיא') : week.city),
      h('div', { class: 'swatch', 'aria-hidden': 'true' }, ...(peak ? week.peakDay.palette : week.palette).map((c) => h('i', { style: `background:${c}` }))),
      statusCard(week, ctx.weeks.length));
    el.prize.replaceChildren(prizeCard(week, { today: true }));
    el.atlas.classList.toggle('is-peak', peak);
    const p = instrumentPanel(week, ctx.weeks.length, { peak }); el.panel.replaceWith(p); el.panel = p;
    this.layout(ctx);
    if (!instant) arrive(week.motion, [...el.copy.children].slice(0, 4));
  },
  async travel(ctx, from, to) {
    const g = ctx.globe, leg = to.index === from.index + 1 ? from.index : -1;
    g.setRoute(ctx.weeks, Math.max(from.index, to.index), tokens(to)['--w-accent'], 'atlas'); if (leg >= 0) g.legProgress(leg, 0);
    if (reduced()) { applyTokens(tokens(to)); this.show(ctx, to, { instant: true }); return; }
    applyTokens(tokens(to), 1.8);
    g.setAtlasColors(to); g.showColumns(to, to.palette);
    gsap.to(el.copy, { opacity: 0, duration: 0.3 });
    await g.flyTo(to, { frame: 'atlas', duration: 2.2, rise: 0.55, leg });
    gsap.set(el.copy, { opacity: 1 });
    this.show(ctx, to, {});
  },
  async peak(ctx, week, on) {
    const g = ctx.globe;
    if (reduced()) { this.show(ctx, week, { peak: on, instant: true }); return; }
    g.showColumns(week, on ? week.peakDay.palette : week.palette, { ring: on ? 1 : 0, accent: tokens(week, on)['--w-accent'] }); g.setAtlasColors(week, on);
    await g.flyTo(week, { frame: on ? 'atlasPeak' : 'atlas', duration: 1.4, rise: 0 });
    this.show(ctx, week, { peak: on });
  },
  unmount(ctx) { ctx.canvas.classList.remove('bg'); ctx.globe.stop(); ctx.backdrop.style.background = ''; el.root?.remove(); },
};
