// Concept 3, beyond the window: a precise navy-and-white dashboard around one architectural window. The frame is the
// same every week; beyond it, a different escape. A shade closes on the way between weeks; on a peak day we step through.
import gsap from 'gsap';
import { h, ltr, fit, tall, gut } from '../dom.js';
import { slot, setSlot, statusCard, raceBoard, finder, prizeCard, myNumbers, RACE } from '../shell.js';
import { arrive, reduced } from '../motion.js';
import { overlayFlight } from './flight.js';

let el = {};
const MILESTONES = ['יציאה', 'תנאי הסף', 'עשירייה ראשונה', 'מקום 3', 'מקום 2', 'מקום 1'];

function route(week, total) {
  const m = myNumbers(week, total), reached = m.remain ? 1 : 3, at = Math.min(MILESTONES.length - 1, reached + (m.remain ? m.gate : 0.5));
  const pct = (at / (MILESTONES.length - 1)) * 100;
  return h('div', { class: 'win-route' }, h('h3', {}, 'המסלול שלך'),
    h('div', { class: 'ms' }, h('i', { class: 'done', style: `width:${pct}%` }), ...MILESTONES.map((t, i) => h('span', { class: i <= reached ? 'on' : '' }, t)), h('i', { class: 'you', style: `right:${pct}%`, title: 'את/ה כאן' })));
}

export default {
  id: 'window', name: 'מעבר לחלון', en: 'Beyond the Window', look: null,
  mount(ctx, week, peak) {
    el = {};
    el.root = h('div', { class: 'c-win' },
      el.win = h('section', { class: 'win stage' },
        el.right = h('div', { class: 'win-side r' }),
        el.center = h('div', { class: 'win-center' },
          h('p', { class: 'win-open' }, 'השבוע, מעבר לחלון'),
          h('div', { class: 'win-box' },
            el.frame = h('div', { class: 'win-frame' }, el.slot = slot(week), el.light = h('div', { class: 'win-light' }), el.curtain = h('div', { class: 'curtain', 'aria-hidden': 'true' }), el.shade = h('div', { class: 'win-shade', 'aria-hidden': 'true' })),
            h('div', { class: 'win-sill' })),
          el.cap = h('div', { class: 'win-cap' })),
        el.left = h('div', { class: 'win-side l' }),
        el.route = h('div'),
        el.peak = h('div', { class: 'win-peak' }, el.peakSlot = slot(week, { peak: true }), h('div', { class: 'scrim' }), el.peakHd = h('div', { class: 'hd' }), el.peakCard = h('div'))),
      h('section', { class: 'panel' }, h('div', { class: 'panel-in two' }, raceBoard(), finder())));
    ctx.root.append(el.root);
  },
  // The country under the window as wide as the column; the peak headline as large as the scene allows.
  layout() {
    const H = el.center.clientHeight, W = el.peak.clientWidth, t = tall() || innerWidth < 1100;
    fit(el.cap.querySelector('h1'), { w: el.cap.clientWidth, h: H * 0.11 });
    fit(el.peakHd.querySelector('h2'), { w: t ? W - 2 * gut() : W * 0.55, h: el.peak.clientHeight * (t ? 0.15 : 0.2) });
  },
  show(ctx, week, { peak = false, instant = false } = {}) {
    setSlot(el.slot, week); setSlot(el.peakSlot, week, true);
    el.cap.replaceChildren(h('h1', {}, week.country), h('p', {}, h('b', {}, week.city), ` · ${week.datesLong}`));
    el.right.replaceChildren(statusCard(week, ctx.weeks.length));
    el.left.replaceChildren(raceBoard({ rows: RACE.slice(0, 5), compact: true }), prizeCard(week, { today: peak }));
    const r = route(week, ctx.weeks.length); el.route.replaceWith(r); el.route = r;
    el.peakHd.replaceChildren(h('p', {}, 'יום שיא · היום עד ', ltr('23:59')), h('h2', {}, week.peakDay.theme ?? 'יום שיא'));
    el.peakCard.replaceChildren(prizeCard(week, { today: true }));
    el.win.classList.toggle('is-peak', peak);
    gsap.set(el.peak, { clipPath: peak ? 'inset(0% 0% 0% 0%)' : 'inset(50% 50% 50% 50%)' });
    this.layout();
    if (!instant && !reduced()) {
      gsap.fromTo(el.curtain, { xPercent: -26, skewX: -4 }, { xPercent: 0, skewX: 0, duration: 2.4, ease: 'sine.inOut' }); // the curtain moves once
      gsap.fromTo(el.light, { xPercent: -8, opacity: 0.4 }, { xPercent: 0, opacity: 1, duration: 3, ease: 'sine.out' });
      arrive(week.motion, el.cap.children);
    }
  },
  async travel(ctx, from, to) {
    const rm = reduced();
    if (!rm) await gsap.to(el.shade, { yPercent: 101, duration: 0.6, ease: 'power2.inOut' });
    const f = el.frame.getBoundingClientRect(), centre = [f.left + f.width / 2, f.top + f.height / 2];
    await overlayFlight(ctx, from, to, { clip: `inset(${f.top}px ${innerWidth - f.right}px ${innerHeight - f.bottom}px ${f.left}px round ${f.width / 2}px ${f.width / 2}px 0 0 / ${f.height * 0.26}px ${f.height * 0.26}px 0 0)`, centre, frame: 'porthole', duration: 2.0, during: () => this.show(ctx, to, { instant: true }) });
    if (!rm) { await gsap.to(el.shade, { yPercent: 0, duration: 0.7, ease: 'power2.inOut' }); gsap.set(el.shade, { yPercent: 0 }); }
    this.show(ctx, to, {});
  },
  async peak(ctx, week, on) {
    if (on && !reduced()) {
      this.show(ctx, week, { peak: false, instant: true });
      const s = el.peak.getBoundingClientRect(), f = el.frame.getBoundingClientRect();
      const from = `inset(${f.top - s.top}px ${s.right - f.right}px ${s.bottom - f.bottom}px ${f.left - s.left}px round 40%)`;
      el.win.classList.add('is-peak');
      await gsap.fromTo(el.peak, { clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0%)', duration: 1.1, ease: 'power3.inOut' });
      el.left.replaceChildren(raceBoard({ rows: RACE.slice(0, 5), compact: true }), prizeCard(week, { today: true }));
      arrive(week.motion, el.peakHd.children); return;
    }
    this.show(ctx, week, { peak: on });
  },
  unmount() { el.root?.remove(); },
};
