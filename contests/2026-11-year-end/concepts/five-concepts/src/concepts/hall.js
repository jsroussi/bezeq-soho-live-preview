// Concept 1, the departures hall: a dark terminal, a glass wall, and beyond it the week's destination. One route
// ribbon runs across the floor and through the glass into the scene. The Bezeq panel stays below, opaque.
import gsap from 'gsap';
import { h, ltr, fit, tall } from '../dom.js';
import { slot, setSlot, statusCard, raceBoard, finder, prizeCard } from '../shell.js';
import { arrive, reduced } from '../motion.js';
import { overlayFlight, clipTo } from './flight.js';

let el = {};
const bez = (p0, c1, c2, p1, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k]); };

// The ribbon: a tapered band from the viewer's feet to the window sill, then thin into the scene until it is gone.
function drawRibbon(animate) {
  const st = el.hall.getBoundingClientRect(), w = el.win.getBoundingClientRect(), W = st.width, H = st.height;
  const wt = w.top - st.top, wb = w.bottom - st.top, sill = [W * 0.5, wb + 4], k = Math.max(0.45, Math.min(1, W / 1600)), side = 14 * k;
  const segs = [[[W * 1.04, H * 1.06], [W * 0.82, H * 0.9], [W * 0.6, H * 1.0], sill, 46 * k, 8 * k], [sill, [W * 0.47, wb - (wb - wt) * 0.24], [W * 0.43, wt + (wb - wt) * 0.62], [W * 0.35, wt + (wb - wt) * 0.48], 8 * k, 1]];
  const L = [], R = [], C = [], lights = [];
  segs.forEach(([p0, c1, c2, p1, w0, w1], si) => {
    for (let i = 0; i <= 48; i++) {
      const t = i / 48, p = bez(p0, c1, c2, p1, t), q = bez(p0, c1, c2, p1, Math.min(1, t + 0.01)), dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, hw = (w0 + (w1 - w0) * t) / 2;
      L.push([p[0] + nx * hw, p[1] + ny * hw]); R.push([p[0] - nx * hw, p[1] - ny * hw]); C.push(p);
      if (si === 0 && i % 6 === 3) for (const s of [1, -1]) lights.push([p[0] + nx * (hw + side) * s, p[1] + ny * (hw + side) * s]);
    }
  });
  const pts = [...L, ...R.reverse()].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const end = C[C.length - 1];
  el.ribbon.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el.ribbon.replaceChildren(
    h('defs', {}, h('linearGradient', { id: 'rg', gradientUnits: 'userSpaceOnUse', x1: W, y1: H, x2: end[0], y2: end[1] },
      h('stop', { offset: '0', style: 'stop-color:var(--w-accent);stop-opacity:1' }), h('stop', { offset: '.62', style: 'stop-color:var(--w-accent);stop-opacity:.9' }), h('stop', { offset: '1', style: 'stop-color:var(--w-accent);stop-opacity:0' }))),
    h('polygon', { points: pts, fill: 'url(#rg)', class: 'band' }),
    h('path', { d: 'M' + C.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L'), fill: 'none', stroke: 'rgba(255,255,255,.55)', 'stroke-width': 1.5, class: 'line' }));
  el.lights.replaceChildren(...lights.map(([x, y]) => h('i', { style: `left:${x}px;top:${y}px` })));
  if (animate && !reduced()) {
    const line = el.ribbon.querySelector('.line'), len = line.getTotalLength();
    gsap.fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' });
    gsap.fromTo(el.ribbon.querySelector('.band'), { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power1.out' });
  }
}

function copy(week, peak) {
  return peak
    ? [h('p', { class: 'gate' }, 'יום שיא · היום עד ', ltr('23:59')), h('h1', {}, week.peakDay.theme ?? 'יום שיא'), h('p', { class: 'city' }, `${week.city}, ${week.country}`), h('p', { class: 'story' }, 'האולם הופך לאירוע.')]
    : [h('p', { class: 'gate' }, `שער ${week.order} · ${week.datesLong}`), h('h1', {}, week.country), h('p', { class: 'city' }, week.city), h('p', { class: 'story' }, week.line)];
}

// The status card as a boarding document: the same facts, and a stub that collects one stamp per week reached.
function panel(week, total, peak, weeks) {
  const card = statusCard(week, total, { variant: 'pass' });
  card.append(h('div', { class: 'stub' }, h('p', {}, 'חותמות'), h('div', { class: 'stamps' }, weeks.map((w) => h('i', { class: w.index < week.index ? (w.index === 1 ? 'miss' : 'got') : w.index === week.index ? 'now' : '', title: w.city }, w.city)))));
  return h('section', { class: 'panel' }, h('div', { class: 'panel-in' }, card, raceBoard(), h('div', { class: 'col' }, finder(), prizeCard(week, { today: peak }))));
}

export default {
  id: 'hall', name: 'אולם היציאות', en: 'The Departures Hall', look: null,
  mount(ctx, week, peak) {
    el = {};
    el.root = h('div', { class: 'c-hall' },
      el.hall = h('section', { class: 'hall stage' },
        el.scene = h('div', { class: 'hall-scene', style: 'position:absolute;inset:0' },
          h('div', { class: 'hall-wall' }),
          el.win = h('div', { class: 'hall-window' }, el.slot = slot(week, { peak }), h('div', { class: 'hall-scrim' }), h('div', { class: 'mullions', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'), h('b')), el.copy = h('div', { class: 'hall-copy' })),
          h('div', { class: 'hall-floor' }, el.refl = slot(week, { peak, cls: 'refl' })),
          el.ribbon = h('svg', { class: 'ribbon', 'aria-hidden': 'true', preserveAspectRatio: 'none' })),
        el.peak = h('div', { class: 'hall-peak', 'aria-hidden': 'true' }, h('i', { class: 'spot s1' }), h('i', { class: 'spot s2' }), el.lights = h('div', { class: 'runway' })),
        el.prize = h('div')),
      el.panel = panel(week, ctx.weeks.length, peak, ctx.weeks));
    ctx.root.append(el.root);
  },
  // The country's name as large as the copy column allows; the ribbon redrawn for the new size.
  layout() {
    const H = el.hall.clientHeight;
    fit(el.copy.querySelector('h1'), { w: el.copy.clientWidth, h: H * (tall() ? 0.14 : 0.19) });
    drawRibbon(false);
  },
  show(ctx, week, { peak = false, instant = false } = {}) {
    setSlot(el.slot, week, peak); setSlot(el.refl, week, peak);
    el.copy.replaceChildren(...copy(week, peak));
    el.hall.classList.toggle('is-peak', peak);
    el.prize.replaceChildren(peak ? prizeCard(week, { today: true }) : '');
    const p = panel(week, ctx.weeks.length, peak, ctx.weeks); el.panel.replaceWith(p); el.panel = p;
    this.layout(); drawRibbon(!instant);
    if (!instant) arrive(week.motion, el.copy.children);
    if (peak && !instant && !reduced()) gsap.fromTo(el.lights.children, { opacity: 0 }, { opacity: 1, duration: 0.08, stagger: 0.06, ease: 'none' });
  },
  async travel(ctx, from, to) {
    if (!reduced()) await gsap.to(el.scene, { scale: 1.45, duration: 0.6, ease: 'power2.in', transformOrigin: '50% 38%' });
    await overlayFlight(ctx, from, to, { clip: clipTo(el.hall), frame: 'near', during: () => { this.show(ctx, to, { instant: true }); gsap.set(el.scene, { scale: 1.12, transformOrigin: '50% 38%' }); } });
    gsap.to(el.scene, { scale: 1, duration: 0.9, ease: 'power3.out' });
    drawRibbon(true); arrive(to.motion, el.copy.children);
  },
  async peak(ctx, week, on) { this.show(ctx, week, { peak: on }); },
  unmount() { el.root?.remove(); },
};
