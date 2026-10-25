// A small element builder: h('div', { class: 'x' }, 'text', child).
export function h(tag, attrs = {}, ...kids) {
  const svg = ['svg', 'path', 'circle', 'g', 'defs', 'clipPath', 'rect', 'line', 'polygon', 'linearGradient', 'stop', 'mask'].includes(tag);
  const el = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v); else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
// Numbers, percentages and Latin names inside Hebrew lines.
export const ltr = (s) => h('bdi', { dir: 'ltr' }, s);
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Portrait and near-square screens get the stacked layouts (the same test as the stylesheet's media queries).
export const tall = () => matchMedia('(max-aspect-ratio: 11/10)').matches;
// The page gutter in px, as in the stylesheet: clamp(16px, 3.3vw, 64px).
export const gut = () => Math.min(64, Math.max(16, innerWidth * 0.033));
// Display type at the largest size that fits its box: never wider than w, never taller than h, never above max.
export function fit(el, { w, h = Infinity, max = Infinity, min = 12 }) {
  if (!el || !w) return;
  el.classList.add('fit');
  el.style.fontSize = '100px';
  const tw = el.offsetWidth || 1, lh = parseFloat(getComputedStyle(el).lineHeight) / 100 || 1;
  el.style.fontSize = `${Math.max(min, Math.min(max, (w / tw) * 100, h / lh)).toFixed(1)}px`;
}
