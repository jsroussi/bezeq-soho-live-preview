// Layer 2, the week theme: colour maths, the CSS variables each week sets, the material patterns, the placeholder
// plates that stand in for photos, and the dates that follow the array order.
import gsap from 'gsap';

export const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(...A.map((v, i) => v + (B[i] - v) * t)); };
const chan = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const lum = (h) => { const [r, g, b] = hex2rgb(h).map(chan); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export const inkOn = (bg, dark = '#14161F', light = '#FFFFFF') => (contrast(bg, light) >= contrast(bg, dark) ? light : dark);
const sat = (h) => { const [r, g, b] = hex2rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
export const byLum = (pal) => [...pal].sort((a, b) => lum(a) - lum(b));

// The weeks get their numbers and Sunday–Thursday dates from their place in the array.
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const day = (iso, add = 0) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + add); return d; };
const iso = (d) => d.toISOString().slice(0, 10);
export function prepareWeeks(weeks, contest) {
  return weeks.map((w, i) => {
    const start = w.dates?.start ?? iso(day(contest.start, i * 7)), end = w.dates?.end ?? iso(day(start, 4));
    const s = day(start), e = day(end), sm = s.getUTCMonth(), em = e.getUTCMonth();
    const long = sm === em ? `${s.getUTCDate()}–${e.getUTCDate()} ב${MONTHS[sm]}` : `${s.getUTCDate()} ב${MONTHS[sm]} – ${e.getUTCDate()} ב${MONTHS[em]}`;
    const short = sm === em ? `${s.getUTCDate()}–${e.getUTCDate()}.${sm + 1}` : `${s.getUTCDate()}.${sm + 1}–${e.getUTCDate()}.${em + 1}`;
    return { ...w, order: i + 1, index: i, start, end, datesLong: long, datesShort: short, asOf: `${day(start, 2).getUTCDate()}.${day(start, 2).getUTCMonth() + 1}` };
  });
}

// Everything the page reads from the week, as CSS variables. The peak day swaps in its own palette.
export function tokens(week, peak = false) {
  const pal = peak ? week.peakDay.palette : week.palette;
  const s = byLum(pal), deep = s[0], light = s[s.length - 1];
  const accent = peak ? [...pal].sort((a, b) => sat(b) * (0.4 + lum(b)) - sat(a) * (0.4 + lum(a)))[0] : week.accent;
  return {
    '--w1': pal[0], '--w2': pal[1], '--w3': pal[2], '--w4': pal[3] ?? pal[2],
    '--w-deep': deep, '--w-light': light, '--w-mid': s[1] ?? mix(deep, light, 0.5), '--w-mid2': s[2] ?? s[1] ?? light,
    '--w-accent': accent, '--w-on-accent': inkOn(accent), '--w-on-deep': inkOn(deep), '--w-on-light': inkOn(light),
    '--w-glow': mix(light, '#FFFFFF', 0.2), '--w-shade': mix(deep, '#000000', 0.35),
  };
}

export function applyTokens(tok, duration = 0) {
  const root = document.documentElement;
  if (!duration) { for (const [k, v] of Object.entries(tok)) root.style.setProperty(k, v); return null; }
  return gsap.to(root, { ...tok, duration, ease: 'power2.inOut' });
}

// Material patterns: one per week, drawn as SVG, used faintly behind the stage. No clip-art: only the surface.
const svg = (w, h, body, o = 1) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><g opacity='${o}'>${body}</g></svg>`)}")`;
export const PATTERNS = {
  zinc: (c, o = 0.16) => svg(36, 36, `<path d='M0 0V36M3 0V36' stroke='${c}' stroke-width='1.2' fill='none'/><path d='M18 0V36' stroke='${c}' stroke-opacity='.45' stroke-width='1' fill='none'/>`, o),
  mosaic: (c, o = 0.16) => svg(64, 64, `<g fill='none' stroke='${c}' stroke-width='1.2'><rect x='2' y='2' width='60' height='60'/><circle cx='32' cy='32' r='18'/><path d='M32 2V14M32 50V62M2 32H14M50 32H62'/></g>`, o),
  plaster: (c, o = 0.22) => svg(180, 180, `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.012 .03' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.05'/></filter><rect width='180' height='180' filter='url(#n)'/>`, o),
  strata: (c, o = 0.16) => svg(240, 60, `<g fill='none' stroke='${c}' stroke-width='1.2'><path d='M0 12 Q60 2 120 12 T240 12'/><path d='M0 30 Q60 22 120 30 T240 30' stroke-opacity='.6'/><path d='M0 48 Q60 40 120 48 T240 48' stroke-opacity='.35'/></g>`, o),
  caustics: (c, o = 0.16) => svg(120, 120, `<g fill='none' stroke='${c}' stroke-width='1.1'><path d='M0 30 C30 10 50 50 80 28 S120 30 120 30'/><path d='M0 80 C25 60 55 100 85 76 S120 84 120 84' stroke-opacity='.6'/><path d='M30 0 C40 30 10 60 34 120' stroke-opacity='.5'/><path d='M84 0 C70 34 100 70 80 120' stroke-opacity='.4'/></g>`, o),
  kumiko: (c, o = 0.16) => svg(48, 48, `<g fill='none' stroke='${c}' stroke-width='1'><rect x='0.5' y='0.5' width='47' height='47'/><path d='M24 0V48M0 24H48'/><path d='M0 0L24 24L48 0M0 48L24 24L48 48' stroke-opacity='.45'/></g>`, o),
  deco: (c, o = 0.16) => svg(120, 64, `<g fill='none' stroke='${c}' stroke-width='1.1'>${[16, 30, 44, 58].map((r) => `<path d='M${60 - r} 64A${r} ${r} 0 0 1 ${60 + r} 64'/>`).join('')}<path d='M60 64V4M60 64L22 14M60 64L98 14' stroke-opacity='.5'/></g>`, o),
  jali: (c, o = 0.16) => svg(40, 52, `<g fill='none' stroke='${c}' stroke-width='1.1'><path d='M8 48V22A12 12 0 0 1 32 22V48Z'/><path d='M20 10V2' stroke-opacity='.5'/></g>`, o),
  ashlar: (c, o = 0.16) => svg(160, 64, `<g fill='none' stroke='${c}' stroke-width='1.1'><path d='M0 0.5H160M0 32H160M0 63.5H160'/><path d='M40 0V32M104 0V32M136 0V32M18 32V64M70 32V64M122 32V64' stroke-opacity='.7'/></g>`, o),
};
export const GRAIN = svg(220, 220, `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .55 0'/></filter><rect width='220' height='220' filter='url(#g)'/>`);

// The photo placeholder: the week's light as a plate (sky, horizon, ground) in its own colours, the material faintly
// over it, and a caption naming the shot that goes here. Honest about being a placeholder; never a fake photograph.
export function plate(week, peak = false) {
  const pal = peak ? week.peakDay.palette : week.palette, s = byLum(pal), [d, m1] = s, l = s[s.length - 1], m2 = s[s.length - 2] ?? m1;
  const light = peak ? 'night' : week.light, acc = peak ? tokens(week, true)['--w-accent'] : week.accent;
  const sky = {
    blue: `radial-gradient(ellipse 60% 38% at 38% 74%, ${mix(m2, '#FFFFFF', 0.15)}cc, transparent 70%), linear-gradient(180deg, ${d} 0%, ${m1} 46%, ${m2} 72%, ${mix(d, m1, 0.5)} 73%, ${d} 100%)`,
    golden: `radial-gradient(ellipse 50% 34% at 62% 70%, ${mix(l, '#FFF3D6', 0.4)}, transparent 72%), linear-gradient(180deg, ${m2} 0%, ${l} 56%, ${mix(m1, d, 0.3)} 70%, ${d} 100%)`,
    morning: `radial-gradient(ellipse 46% 40% at 30% 30%, ${mix(l, '#FFFFFF', 0.5)}, transparent 70%), linear-gradient(180deg, ${l} 0%, ${m2} 55%, ${m1} 78%, ${d} 100%)`,
    noon: `linear-gradient(118deg, transparent 0 46%, ${mix(d, m1, 0.35)}e6 46.2% 100%), linear-gradient(180deg, ${mix(l, '#FFFFFF', 0.3)} 0%, ${l} 40%, ${m2} 100%)`,
    dusk: `radial-gradient(ellipse 70% 30% at 50% 72%, ${acc}aa, transparent 70%), linear-gradient(180deg, ${d} 0%, ${m1} 40%, ${m2} 70%, ${mix(d, '#000000', 0.2)} 72%, ${d} 100%)`,
    night: `radial-gradient(circle at 30% 64%, ${acc}88 0, transparent 9%), radial-gradient(circle at 58% 58%, ${m2}66 0, transparent 12%), radial-gradient(circle at 78% 68%, ${acc}55 0, transparent 8%), linear-gradient(180deg, ${mix(d, '#000000', 0.25)} 0%, ${d} 55%, ${mix(d, m1, 0.35)} 100%)`,
  }[light] ?? `linear-gradient(180deg, ${l}, ${d})`;
  const pat = PATTERNS[week.texture]?.(light === 'night' || light === 'dusk' || light === 'blue' ? l : d) ?? 'none';
  return { background: `${GRAIN}, ${pat}, ${sky}`, size: 'auto, auto, cover', blend: 'overlay, normal, normal' };
}
