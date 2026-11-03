// Layer 1, the Bezeq shell: the top bar, your status card, the race, the finder and the neutral prize card.
// Identical in every week and every concept; only where a concept places them changes.
import { h, ltr } from './dom.js';
import { plate } from './theme.js';

const pct = (x) => `${Math.round(x * 100)}%`;
export const RACE = [
  { r: 1, n: 'נציג/ה 4', team: 'מכירות סוהו', proj: 2.4, met: true },
  { r: 2, n: 'נציג/ה 34', team: 'מכירות סוהו', proj: 2.1, met: true },
  { r: 3, n: 'נציג/ה 7', team: 'מכירות סוהו', proj: 1.24, met: true, me: true },
  { r: 4, n: 'נציג/ה 19', team: 'מכירות שטח', proj: 1.18, met: true },
  { r: 5, n: 'נציג/ה 51', team: 'מכירות סוהו', proj: 1.12, met: true },
  { r: 6, n: 'נציג/ה 27', team: 'מכירות שטח', proj: 1.05, met: false },
  { r: 7, n: 'נציג/ה 10', team: 'מכירות סוהו', proj: 0.97, met: false },
  { r: 8, n: 'נציג/ה 36', team: 'מכירות שטח', proj: 0.9, met: false },
  { r: 9, n: 'נציג/ה 23', team: 'מכירות סוהו', proj: 0.84, met: false },
  { r: 10, n: 'נציג/ה 44', team: 'מכירות שטח', proj: 0.79, met: false },
];
const SECTORS = ['סוהו', 'פרסום דיגיטלי', 'חשמל', 'שירות'];

const icon = (name) => {
  const d = { search: 'M10.5 3a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Zm0 0M16 16l5 5', chevron: 'M6 9l6 6 6-6' }[name];
  return h('svg', { viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': 'true', class: 'ico' }, h('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
};

export function topBar(contest) {
  return h('header', { class: 'top' },
    h('a', { class: 'brand', href: '#' }, h('b', { class: 'logo' }, 'בזק'), h('i', { class: 'sep' }), h('span', { class: 'camp' }, contest.name)),
    h('nav', { class: 'nav', 'aria-label': 'ניווט' }, ['המירוץ', 'השבוע', 'המסלול', 'התקנון'].map((t) => h('a', { href: '#' }, t))),
    h('div', { class: 'tools' },
      h('label', { class: 'search' }, icon('search'), h('input', { type: 'search', placeholder: 'חיפוש: שם, צוות או מחלקה', 'aria-label': 'חיפוש' })),
      h('a', { class: 'btn', href: '#me' }, 'המקום שלי')));
}

// Demo numbers that move with the week, so switching weeks shows the card changing honestly.
export function myNumbers(week, total) {
  const frac = (week.index + 0.6) / total, deals = Math.round(92 * frac * 1.24), need = 42;
  return { attain: Math.round(frac * 124), deals, remain: Math.max(0, need - deals), gate: Math.min(1, deals / need) };
}

export function statusCard(week, total, { variant = '' } = {}) {
  const m = myNumbers(week, total);
  return h('article', { class: `card me ${variant}`, id: 'me', 'aria-label': 'המצב שלך' },
    h('header', { class: 'me-head' },
      h('div', {}, h('h3', {}, 'המצב שלך'), h('p', {}, 'נציג/ה 7 · מכירות סוהו')),
      h('p', { class: 'asof' }, 'נכון ל־', ltr(week.asOf), ', 08:00 · נתוני דמו')),
    h('div', { class: 'me-main' },
      h('b', { class: 'big' }, ltr(`${m.attain}%`)),
      h('div', {}, h('p', { class: 'lbl' }, 'עמידה ביעד עד היום'), h('p', { class: 'sub' }, `${m.deals} עסקאות מתוך יעד של 92`))),
    h('dl', { class: 'me-stats' },
      h('div', {}, h('dt', {}, 'קצב'), h('dd', {}, ltr('124%'), h('small', {}, ' מהנדרש להיום'))),
      h('div', {}, h('dt', {}, 'תחזית לסוף התקופה'), h('dd', {}, ltr('124%'), h('small', {}, ' לפי הקצב הנוכחי'))),
      h('div', {}, h('dt', {}, 'מקום במגזר'), h('dd', {}, '3', h('small', {}, ' מתוך 14 · סוהו')))),
    h('div', { class: 'me-gate' },
      h('p', {}, h('span', {}, 'תנאי הסף להגרלה'), h('b', {}, m.remain ? `עוד ${m.remain} עסקאות` : 'עברת את תנאי הסף')),
      h('div', { class: 'bar', role: 'img', 'aria-label': `${Math.round(m.gate * 100)}% מתנאי הסף` }, h('i', { style: `width:${Math.round(m.gate * 100)}%` }))),
    h('p', { class: 'me-next' }, h('b', {}, 'התחנה הבאה שלך: '), 'עוד 4 עסקאות למקום 2'));
}

export function raceBoard({ rows = RACE, compact = false } = {}) {
  return h('article', { class: `card board${compact ? ' compact' : ''}`, id: 'race' },
    h('header', {}, h('h3', {}, 'המירוץ'), compact ? null : h('div', { class: 'tabs', role: 'tablist' }, SECTORS.map((s, i) => h('button', { class: i ? '' : 'on', role: 'tab', 'aria-selected': i ? 'false' : 'true' }, s)))),
    compact ? null : h('p', { class: 'note' }, 'לפי עמידה צפויה ביעד, בתוך כל מגזר · ✓ עבר/ה את תנאי הסף'),
    h('ol', {}, rows.map((x) => h('li', { class: x.me ? 'me' : '' }, h('b', { class: 'r' }, x.r), h('span', { class: 'n' }, x.n, h('small', {}, x.team)), h('span', { class: 'ok', 'aria-label': x.met ? 'עבר/ה את תנאי הסף' : '' }, x.met ? '✓' : ''), h('b', { class: 'p' }, ltr(pct(x.proj)))))),
    compact ? null : h('a', { class: 'more', href: '#' }, 'כל ה־14 במגזר סוהו'));
}

export function finder() {
  return h('article', { class: 'card finder' }, h('h3', {}, 'מצאו את עצמכם'),
    h('div', { class: 'sels' }, [['מחלקה', 'מכירות'], ['צוות', 'מכירות סוהו'], ['שם', 'נציג/ה 7']].map(([k, v]) => h('label', { class: 'sel' }, h('small', {}, k), h('select', {}, h('option', {}, v)), icon('chevron')))));
}

// The peak day's local-language and English names under its Hebrew one; local is left out when it repeats one of them.
function peakNames(week) {
  const n = week.peakDay.name; if (!n) return '';
  const loc = n.local && n.local !== n.en && n.local !== n.he ? h('span', { lang: n.lang, dir: 'auto' }, n.local) : null;
  const en = n.en ? h('span', { lang: 'en', dir: 'ltr' }, n.en) : null;
  return h('p', { class: 'names', style: 'margin:2px 0 6px;font-size:13px;opacity:.75;display:flex;flex-wrap:wrap;gap:0 10px' }, ...[loc, en].filter(Boolean));
}

// The prize slot stays empty until the budget is set: a neutral card, never an amount.
export function prizeCard(week, { today = false, tone = '' } = {}) {
  return h('article', { class: `prize ${tone}` },
    h('p', { class: 'k' }, today ? 'יום שיא · היום' : 'יום השיא של השבוע'),
    h('h4', {}, week.peakDay.theme ?? 'יוכרז בקרוב'),
    peakNames(week),
    today ? h('p', { class: 'rule' }, 'היום עד ', ltr('23:59'), '. התנאים יפורסמו בתקנון.') : h('p', { class: 'rule' }, 'היום והשעה יפורסמו מראש, והתנאים בתקנון.'),
    h('div', { class: 'pz' }, h('b', {}, 'הפרס'), h('span', {}, 'יוכרז בקרוב')));
}

export function instrumentPanel(week, total, { variant = '', peak = false } = {}) {
  return h('section', { class: 'panel' }, h('div', { class: 'panel-in' }, statusCard(week, total, { variant }), raceBoard(), h('div', { class: 'col' }, finder(), prizeCard(week, { today: peak }))));
}

// The photo slot: the photo when images/<file> exists, otherwise the week's plate and the brief. The single-file demo
// carries its photos inside (window.PHOTO_DATA); images/photos.js gives each stand-in photo its crop focus and credit.
export function slot(week, { peak = false, cls = '' } = {}) {
  const fig = h('figure', { class: `slot ${cls}` });
  setSlot(fig, week, peak);
  return fig;
}
export function setSlot(fig, week, peak = false) {
  const p = plate(week, peak), file = peak ? week.peakDay.image : week.image, focus = window.PHOTOS?.[file]?.focus;
  Object.assign(fig.style, { backgroundImage: p.background, backgroundSize: p.size, backgroundBlendMode: p.blend });
  fig.classList.remove('has-img');
  fig.replaceChildren(
    h('img', { alt: '', src: window.PHOTO_DATA?.[file] ?? file, style: focus ? `object-position:${focus}` : null, onload: () => fig.classList.add('has-img'), onerror: (e) => e.target.remove() }),
    h('figcaption', {}, h('b', {}, 'מקום לתמונה · 16:9 · עד 2K'), h('span', {}, peak ? week.peakDay.brief : week.brief)));
  return fig;
}

// Credits for the stand-in photos. The list shrinks as the contest's own images replace them, and then disappears.
export function credits(weeks) {
  const P = window.PHOTOS ?? {}, files = weeks.flatMap((w) => [w.image, w.peakDay.image]).filter((f) => P[f]);
  if (!files.length) return '';
  const link = (href, text) => (href ? h('a', { href, target: '_blank', rel: 'noopener' }, text) : text);
  return h('footer', { class: 'credits' }, h('details', {},
    h('summary', {}, 'צילומים זמניים מ־', ltr('Wikimedia Commons'), ', ברישיונות פתוחים · קרדיטים'),
    h('ul', { dir: 'ltr' }, files.map((f) => h('li', {}, link(P[f].page, P[f].title), ` · ${P[f].creator} · `, link(P[f].licenseUrl, P[f].license)))),
    h('p', {}, 'הצילומים הוקטנו ונחתכו, והם יוחלפו בתמונות של התחרות.')));
}
