// Concept 2, the world edition: every week is a new cover of a travel magazine. One photograph, one enormous
// cropped country name, one short story. Past weeks fold into an archive of covers. Results stay white and slate.
import gsap from 'gsap';
import { h, ltr, fit, tall, gut } from '../dom.js';
import { slot, setSlot, instrumentPanel, prizeCard } from '../shell.js';
import { arrive, reduced } from '../motion.js';
import { overlayFlight, clipTo } from './flight.js';
import { tokens } from '../theme.js';

let el = {};

// The part of the title that crosses the photograph takes the accent colour, so the name reads as one shape.
function clipTitle() {
  const t = el.title.getBoundingClientRect(), p = el.photo.getBoundingClientRect();
  const overlap = Math.max(0, p.right - t.left);
  el.over.style.clipPath = `inset(${Math.max(0, p.top - t.top)}px ${Math.max(0, t.width - overlap)}px ${Math.max(0, t.bottom - p.bottom)}px 0)`;
}

function archive(weeks, week) {
  return weeks.map((w) => h('a', { href: '#', 'data-n': w.order, class: w.index < week.index ? 'past' : w.index === week.index ? 'now' : 'later', style: w.index <= week.index ? `--c:${tokens(w)['--w-deep']}` : '', title: `${w.country} · ${w.datesShort}` }, w.index <= week.index ? w.country : String(w.order)));
}

export default {
  id: 'edition', name: 'מהדורת העולם', en: 'The World Edition', look: null,
  mount(ctx, week, peak) {
    el = {};
    el.root = h('div', { class: 'c-ed' },
      el.ed = h('section', { class: 'ed stage' },
        el.mast = h('header', { class: 'ed-mast' }, h('b', {}, 'מהדורת העולם'), el.issue = h('span')),
        el.photo = slot(week, { cls: 'ed-photo' }),
        el.title = h('div', { class: 'ed-title', 'aria-hidden': 'true' }, el.base = h('span', { class: 't' }), el.over = h('span', { class: 't over' })),
        el.story = h('aside', { class: 'ed-story' }),
        el.archive = h('nav', { class: 'ed-archive', 'aria-label': 'ארכיון הגיליונות' }),
        el.peak = h('div', { class: 'ed-peak' }, el.peakSlot = slot(week, { peak: true }), h('div', { class: 'scrim' }), el.peakHd = h('div', { class: 'hd' }), el.peakCard = h('div')),
        el.wipe = h('div', { class: 'ed-wipe' })),
      el.panel = instrumentPanel(week, ctx.weeks.length, { peak }));
    ctx.root.append(el.root);
  },
  // The cover's name as large as the page allows, the overprint re-cut to the photo; the peak headline likewise.
  layout() {
    const W = el.ed.clientWidth, H = el.ed.clientHeight, t = tall();
    fit(el.title, { w: W - 2 * gut(), h: H * (t ? 0.24 : 0.4) });
    el.ed.style.setProperty('--ts', el.title.style.fontSize);
    fit(el.peakHd.querySelector('h2'), { w: t ? W - 2 * gut() : W * 0.62, h: H * (t ? 0.16 : 0.22) });
    clipTitle();
  },
  show(ctx, week, { peak = false, instant = false } = {}) {
    el.issue.replaceChildren(`גיליון ${week.order} · ${week.datesLong} 2026`);
    setSlot(el.photo, week);
    el.base.textContent = el.over.textContent = week.country;
    el.story.replaceChildren(
      h('p', { class: 'city' }, week.city),
      h('h2', {}, week.line),
      h('p', { class: 'lede' }, 'השבוע כולו יוצא מאותה עיר. מי מוביל, איפה אתם, ומתי יום השיא: הכול בגיליון.'),
      h('ul', {}, h('li', {}, 'המירוץ: מי מוביל השבוע'), h('li', {}, 'המקום שלכם, ומה חסר לתחנה הבאה'), h('li', {}, 'יום השיא: ', week.peakDay.theme ?? 'יוכרז בקרוב')));
    el.archive.replaceChildren(...archive(ctx.weeks, week));
    setSlot(el.peakSlot, week, true);
    el.peakHd.replaceChildren(h('p', {}, 'מהדורה מיוחדת · יום שיא · היום עד ', ltr('23:59')), h('h2', {}, week.peakDay.theme ?? 'יום שיא'));
    el.peakCard.replaceChildren(prizeCard(week, { today: true }));
    el.ed.classList.toggle('is-peak', peak);
    el.mast.firstChild.textContent = peak ? 'מהדורה מיוחדת' : 'מהדורת העולם';
    const p = instrumentPanel(week, ctx.weeks.length, { peak }); el.panel.replaceWith(p); el.panel = p;
    this.layout();
    if (!instant) arrive(week.motion, peak ? el.peakHd.children : [el.title, ...el.story.children]);
  },
  async travel(ctx, from, to) {
    const rm = reduced();
    if (!rm) { gsap.set(el.wipe, { background: tokens(to)['--w-deep'] }); await gsap.fromTo(el.wipe, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.55, ease: 'power3.inOut' }); }
    await overlayFlight(ctx, from, to, { clip: clipTo(el.ed), frame: 'near', duration: 2.0, during: () => this.show(ctx, to, { instant: true }) });
    if (!rm) {
      await gsap.to(el.wipe, { clipPath: 'inset(0 100% 0 0%)', duration: 0.6, ease: 'power3.inOut' });
      gsap.set(el.wipe, { clipPath: 'inset(0 0 0 100%)' });
      const past = el.archive.children[from.index]; if (past) gsap.from(past, { scale: 2.4, opacity: 0, duration: 0.6, ease: 'power3.out', transformOrigin: '50% 100%' });
    }
    arrive(to.motion, [el.title, ...el.story.children]);
  },
  async peak(ctx, week, on) {
    if (on && !reduced()) { el.ed.classList.add('is-peak'); this.show(ctx, week, { peak: true, instant: true }); await gsap.fromTo(el.peak, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.7, ease: 'power3.inOut' }); arrive(week.motion, el.peakHd.children); return; }
    gsap.set(el.peak, { clearProps: 'clipPath' }); this.show(ctx, week, { peak: on });
  },
  unmount() { el.root?.remove(); },
};
