// PD-3 (SPEC-PD3): the organiser fills the day's status (blocks of teams × up to 3 metrics, target and actual), picks the stop's
// photo or their own, and gets a 1080 px PNG to post. The drawing is the admin's (statusImage.js drawStatus); this file only
// gathers the input. No network, no IDs: the organiser types team names. The draft lives in localStorage when allowed.
import { drawStatus } from '../../../../platform/src/updater/statusImage.js';

const STOPS = window.PD3_STOPS ?? []; // [{ id, he, week, photo }] from the build (the peak photos as data URIs)
const PRESETS = ['פתיחות ביזנט', 'פתיחות סנטריקס', 'מכירות מדריך', 'מכירות ריסלר', 'לידים ממומשים', 'הסכמים חתומים', 'העברות לידים חשמל'];
const MAX_METRICS = 3; // drawStatus lays out three metric groups beside the team column
const KEY = 'pd3-draft';
const NAVY = '#11152B', SKY = '#A9DBFF';

const blank = () => ({ target: '', actual: '' });
const block = (title, metrics) => ({ title, metrics, rows: [{ team: '', cells: metrics.map(blank) }, { team: '', cells: metrics.map(blank) }] });
// A fresh draft starts at now, so the image's "עדכון" line is never left without its time.
const now = () => { const d = new Date(), z = (n) => String(n).padStart(2, '0'); return { date: `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`, time: `${z(d.getHours())}:${z(d.getMinutes())}` }; };
const fresh = () => ({ title: 'יום שיא', ...now(), note: '', stop: STOPS[0]?.id ?? '', darken: 0.88, // the slider's floor (0.86) keeps the faintest text ≥ 4.5:1 even over a white photo pixel
  blocks: [block('סוהו', PRESETS.slice(0, 2)), block('פרסום', PRESETS.slice(2, 5)), block('חשמל', PRESETS.slice(5, 7))] });

// % = actual ÷ target, rounded; blank without a target (or without an actual).
export const pct = (target, actual) => {
  const t = Number(target), a = Number(actual);
  return target === '' || actual === '' || !Number.isFinite(t) || !Number.isFinite(a) || t <= 0 ? null : Math.round((a / t) * 100);
};

const store = { get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }, clear() { try { localStorage.removeItem(KEY); } catch {} } };

let S = store.get() ?? fresh(), userImage = null;
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

// A tab-separated paste (Excel, several rows): from the cell pasted into, across the row's target/actual cells, then down;
// new rows are added as needed.
export function pasteAt(b, row, col, text) {
  const lines = text.replace(/\r/g, '').split('\n'); if (lines.at(-1) === '') lines.pop();
  lines.forEach((line, i) => {
    const r = row + i;
    while (b.rows.length <= r) b.rows.push({ team: '', cells: b.metrics.map(blank) });
    line.split('\t').forEach((v, j) => {
      const c = col + j, m = Math.floor(c / 2);
      if (m < b.metrics.length) b.rows[r].cells[m][c % 2 ? 'actual' : 'target'] = v.trim().replace(/[,\s%]/g, '');
    });
  });
}

function board() {
  // A table with no filled row is left out of the image (no empty header band).
  return { checkpoint: { label: S.time || '' }, sections: S.blocks.map((b) => ({ title: b.title, measures: b.metrics.map((label) => ({ label })),
    rows: b.rows.filter((r) => r.team.trim() || r.cells.some((c) => c.target !== '' || c.actual !== '')).map((r) => ({ label: r.team,
      cells: r.cells.map((c) => ({ target: c.target, actual: c.actual, pct: pct(c.target, c.actual) })) })) })).filter((sec) => sec.rows.length) };
}

const loadImg = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

export async function draw() {
  const stop = STOPS.find((s) => s.id === S.stop);
  const image = userImage ?? await loadImg(stop?.photo);
  await drawStatus($('out'), { board: board(), peak: { theme: S.title, date: S.date }, week: stop?.week, title: S.note || ' ',
    stop: { he: stop?.he ?? '', peakPalette: [NAVY, SKY], labelInk: SKY }, background: image ? { image, darken: S.darken } : null });
}

let pending = null;
const changed = () => { store.set(S); clearTimeout(pending); pending = setTimeout(draw, 150); };

function renderBlocks() {
  const host = $('blocks'); host.replaceChildren();
  S.blocks.forEach((b, bi) => {
    const heads = el('tr', {}, el('th', { textContent: 'צוות' }));
    b.metrics.forEach((m, mi) => {
      const name = el('input', { value: m, ariaLabel: 'שם המדד', oninput: (e) => { b.metrics[mi] = e.target.value; changed(); } });
      const del = el('button', { className: 'x', textContent: '×', ariaLabel: `הסרת המדד ${m}`, onclick: () => { b.metrics.splice(mi, 1); b.rows.forEach((r) => r.cells.splice(mi, 1)); renderBlocks(); changed(); } });
      heads.append(el('th', { colSpan: 3 }, el('div', { className: 'mhead' }, name, del)));
    });
    heads.append(el('th'));
    const sub = el('tr', {}, el('th'), ...b.metrics.flatMap(() => ['יעד', 'ביצוע', '%'].map((t) => el('th', { textContent: t }))), el('th'));
    const body = el('tbody');
    b.rows.forEach((r, ri) => {
      const tr = el('tr', {}, el('td', { className: 'team' }, el('input', { value: r.team, ariaLabel: 'שם הצוות', oninput: (e) => { r.team = e.target.value; changed(); } })));
      r.cells.forEach((c, mi) => {
        const out = el('span', { className: 'pct' });
        const show = () => { const p = pct(c.target, c.actual); out.textContent = p == null ? '' : `${p}%`; out.classList.toggle('ok', p != null && p >= 100); };
        for (const [k, col] of [['target', mi * 2], ['actual', mi * 2 + 1]]) {
          tr.append(el('td', {}, el('input', { value: c[k], inputMode: 'decimal', ariaLabel: `${k === 'target' ? 'יעד' : 'ביצוע'} ${b.metrics[mi]}`,
            oninput: (e) => { c[k] = e.target.value.replace(/[,\s%]/g, ''); show(); changed(); },
            onpaste: (e) => { const t = e.clipboardData?.getData('text') ?? ''; if (!/[\t\n]/.test(t)) return; e.preventDefault(); pasteAt(b, ri, col, t); renderBlocks(); changed(); } })));
        }
        show(); tr.append(el('td', {}, out));
      });
      tr.append(el('td', {}, el('button', { className: 'x', textContent: '×', ariaLabel: 'הסרת השורה', onclick: () => { b.rows.splice(ri, 1); renderBlocks(); changed(); } })));
      body.append(tr);
    });
    const preset = el('select', { ariaLabel: 'מדד להוספה' }, ...PRESETS.map((p) => el('option', { value: p, textContent: p })), el('option', { value: '', textContent: 'מדד חדש' }));
    host.append(el('div', { className: 'block' },
      el('div', { className: 'bhead' },
        el('input', { value: b.title, ariaLabel: 'כותרת הטבלה', oninput: (e) => { b.title = e.target.value; changed(); } }),
        preset,
        el('button', { textContent: '+ מדד', disabled: b.metrics.length >= MAX_METRICS, onclick: () => { b.metrics.push(preset.value || 'מדד'); b.rows.forEach((r) => r.cells.push(blank())); renderBlocks(); changed(); } }),
        el('button', { textContent: '+ שורה', onclick: () => { b.rows.push({ team: '', cells: b.metrics.map(blank) }); renderBlocks(); changed(); } }),
        el('button', { textContent: 'הסרת הטבלה', onclick: () => { S.blocks.splice(bi, 1); renderBlocks(); changed(); } })),
      el('div', { className: 'scroll' }, el('table', {}, el('thead', {}, heads, sub), body))));
  });
}

function renderFields() {
  for (const k of ['title', 'date', 'time', 'note']) { $(k).value = S[k]; $(k).oninput = (e) => { S[k] = e.target.value; changed(); }; }
  $('stop').replaceChildren(...STOPS.map((s) => el('option', { value: s.id, textContent: `שבוע ${s.week} · ${s.he}${s.photo ? '' : ' (בלי תמונה עדיין)'}` })), el('option', { value: '', textContent: 'בלי תמונה' }));
  $('stop').value = S.stop; $('stop').onchange = (e) => { S.stop = e.target.value; userImage = null; $('file').value = ''; changed(); };
  $('dark').value = S.darken; $('darkv').textContent = `${Math.round(S.darken * 100)}%`;
  $('dark').oninput = (e) => { S.darken = Number(e.target.value); $('darkv').textContent = `${Math.round(S.darken * 100)}%`; changed(); };
  $('file').onchange = async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = URL.createObjectURL(f); userImage = await loadImg(url); draw(); };
}

const pngBlob = () => new Promise((ok) => $('out').toBlob(ok, 'image/png'));
const fileName = () => `peak-status${S.date ? `-${S.date}` : ''}.png`; // ASCII: Chrome drops a Hebrew download name and saves "download"
const shareText = () => [S.title, S.date || S.time ? `נכון ל־${[S.date.split('-').reverse().join('.'), S.time].filter(Boolean).join(' ')}` : '', S.note].filter(Boolean).join(' · ');
function download(blob) { const url = URL.createObjectURL(blob), a = el('a', { href: url, download: fileName() }); document.body.append(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000); }

// WhatsApp: the image itself through the share sheet when the device can share files; otherwise the PNG downloads and a
// wa.me link with the text appears, opened only by the organiser's click.
export async function share() {
  await draw();
  const blob = await pngBlob(), file = new File([blob], fileName(), { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text: shareText() }); return 'shared'; } catch { return 'cancelled'; } }
  download(blob);
  Object.assign($('walink'), { href: `https://wa.me/?text=${encodeURIComponent(shareText())}`, hidden: false });
  return 'fallback';
}

$('png').onclick = async () => { await draw(); download(await pngBlob()); };
$('share').onclick = share;
$('addBlock').onclick = () => { S.blocks.push(block('טבלה חדשה', PRESETS.slice(0, 1))); renderBlocks(); changed(); };
$('clear').onclick = () => { store.clear(); S = fresh(); userImage = null; renderFields(); renderBlocks(); draw(); };

renderFields(); renderBlocks(); draw();
window.PD3 = { pct, pasteAt, draw, share, state: () => S, set: (v) => { S = v; renderFields(); renderBlocks(); return draw(); }, blob: pngBlob };
