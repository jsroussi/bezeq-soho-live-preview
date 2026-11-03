// Concept 5, golden hour (direction D inside the Bezeq shell): a photographic Earth graded to the week's city and
// its time of day, the country's name across the bottom like a film title. A peak day is the sun setting over the city.
import gsap from 'gsap';
import { h, ltr, fit, tall, gut } from '../dom.js';
import { instrumentPanel, prizeCard } from '../shell.js';
import { arrive, reduced } from '../motion.js';
import { applyTokens, tokens } from '../theme.js';
import { gradeFor } from '../globe.js';

let el = {};

export default {
  id: 'golden', name: 'שעת זהב', en: 'Golden Hour', look: 'photo',
  mount(ctx, week, peak) {
    el = {};
    el.root = h('div', { class: 'c-gold' },
      el.gold = h('section', { class: 'gold stage' }, h('div', { class: 'gold-scrim' }), el.title = h('div', { class: 'gold-title' }), el.next = h('div', { class: 'gold-peak' }), el.prize = h('div', { class: 'prize-wrap' })),
      el.panel = instrumentPanel(week, ctx.weeks.length, { peak }));
    ctx.root.append(el.root);
    ctx.canvas.classList.add('bg'); ctx.globe.setLook('photo'); ctx.globe.start();
  },
  // The film title as wide as the screen, never taller than a quarter of it.
  layout() {
    fit(el.title.querySelector('h1'), { w: el.gold.clientWidth - 2 * gut(), h: el.gold.clientHeight * (tall() ? 0.15 : 0.25) });
  },
  show(ctx, week, { peak = false, instant = false, keepGrade = false } = {}) {
    const g = ctx.globe;
    g.setLook('photo'); if (!keepGrade) { g.setGrade(week, peak); ctx.backdrop.style.background = gradeFor(week, peak).space; }
    g.setRoute(ctx.weeks, week.index, tokens(week)['--w-accent'], 'photo'); g.frameNow(week, 'hero');
    el.title.replaceChildren(
      h('p', { class: 'line' }, peak ? ['יום שיא · ', week.city, ' · היום עד ', ltr('23:59')] : `שבוע ${week.order} מתוך ${ctx.weeks.length} · ${week.datesLong} · ${week.city}`),
      h('h1', {}, peak ? (week.peakDay.theme ?? 'יום שיא') : week.country), h('p', { class: 'sub' }, peak ? 'השמש שקעה והעיר נדלקה.' : week.line));
    el.next.replaceChildren(h('p', { class: 'k' }, 'יום השיא של השבוע'), h('p', { class: 'v' }, week.peakDay.theme ?? 'יוכרז בקרוב'), h('p', { class: 'd' }, 'היום והשעה יפורסמו מראש'));
    el.prize.replaceChildren(prizeCard(week, { today: true }));
    el.gold.classList.toggle('is-peak', peak);
    const p = instrumentPanel(week, ctx.weeks.length, { peak }); el.panel.replaceWith(p); el.panel = p;
    this.layout();
    if (!instant) arrive(week.motion, el.title.children);
  },
  async travel(ctx, from, to) {
    const g = ctx.globe, leg = to.index === from.index + 1 ? from.index : -1;
    g.setRoute(ctx.weeks, Math.max(from.index, to.index), tokens(to)['--w-accent'], 'photo'); if (leg >= 0) g.legProgress(leg, 0);
    if (reduced()) { applyTokens(tokens(to)); this.show(ctx, to, { instant: true }); return; }
    applyTokens(tokens(to), 2.2); g.setGrade(to, false, 2.6);
    gsap.to(ctx.backdrop, { background: gradeFor(to).space, duration: 2.2 });
    gsap.to(el.title, { opacity: 0, y: 20, duration: 0.4, ease: 'power2.in' });
    await g.flyTo(to, { frame: 'hero', duration: 2.8, rise: 1.6, leg });
    gsap.set(el.title, { opacity: 1, y: 0 });
    this.show(ctx, to, { keepGrade: true });
  },
  async peak(ctx, week, on) {
    if (reduced()) { this.show(ctx, week, { peak: on, instant: true }); return; }
    ctx.globe.setGrade(week, on, 2.4);
    gsap.to(ctx.backdrop, { background: gradeFor(week, on).space, duration: 2.4 });
    await gsap.to(el.title, { opacity: 0, duration: 0.5 });
    this.show(ctx, week, { peak: on, keepGrade: true });
    gsap.set(el.title, { opacity: 1 });
  },
  unmount(ctx) { ctx.canvas.classList.remove('bg'); ctx.globe.stop(); ctx.backdrop.style.background = ''; el.root?.remove(); },
};
