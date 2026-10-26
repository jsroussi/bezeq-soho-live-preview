// The public preview runs on Artyom's real October file, as if the contest had started on 27 September: pick a day and
// the site shows the race as it stood at the end of that day. Old links (?demoWeek=N) open two days into that week.
(function datePreview(ix) {
  const params = new URLSearchParams(location.search);
  const plus = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const week = Number(params.get('demoWeek'));
  let want = /^\d{4}-\d{2}-\d{2}$/.test(params.get('demoDate') || '') ? params.get('demoDate')
    : Number.isInteger(week) && week >= 1 && week <= ix.weeks.length ? plus(ix.weeks[week - 1].start, 2) : ix.dataTo;
  const day = ix.dates.filter((d) => d <= want).pop() || ix.dates[0];
  window.PREVIEW = true; // keep the chosen day stable; do not poll data.js
  window.SITE_SYNC = false; // only this snapshot, never another tab's admin data
  document.write('<script src="demo-days/day-' + day + '.js"><\/script>');
  addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.dir = 'rtl';
    bar.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:2147483647;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;max-width:calc(100vw - 24px);padding:10px 14px;border-radius:16px;background:#20294D;color:#fff;box-shadow:0 4px 20px #0005;font:600 14px Arial';
    const label = document.createElement('label'); label.style.cssText = 'display:flex;align-items:center;gap:8px';
    const input = document.createElement('input'); input.type = 'date'; input.min = ix.dates[0]; input.max = ix.dates.at(-1); input.value = want < input.min ? input.min : want > input.max ? input.max : want;
    input.style.cssText = 'font:inherit;color:#20294D;background:#fff;border-radius:8px;padding:6px 8px;border:0';
    input.addEventListener('change', () => { if (!input.value) return; const url = new URL(location.href); url.searchParams.set('demoDate', input.value); url.searchParams.delete('demoWeek'); location.assign(url); });
    label.append('תאריך', input);
    const w = ix.weeks.findIndex((x) => day >= x.start && day <= plus(x.start, 6));
    const note = document.createElement('small'); note.style.cssText = 'font-weight:400;opacity:.85';
    note.textContent = (w >= 0 ? 'שבוע ' + (w + 1) + ' · ' + ix.weeks[w].label + ' · ' : '') + 'נתוני ארטיום 1–25.10' + (day > ix.dataTo ? ' (אחרי סוף הקובץ)' : '');
    // The week's demo peak day: one tap to see the takeover (or back to the last day of the file from it).
    const peak = w >= 0 ? (ix.peaks || []).find((x) => x >= ix.weeks[w].start && x <= plus(ix.weeks[w].start, 6)) : null;
    const jump = document.createElement('a');
    const onPeak = peak && day === peak;
    jump.textContent = onPeak ? 'חזרה ליום רגיל' : 'יום השיא של השבוע';
    jump.style.cssText = 'color:#fff;background:#ffffff1f;border-radius:999px;padding:6px 12px;text-decoration:none;font-weight:700';
    if (peak) { const u = new URL(location.href); u.searchParams.delete('demoWeek'); u.searchParams.set('demoDate', onPeak ? plus(peak, 1) : peak); if (onPeak) u.searchParams.delete('preview'); jump.href = u.toString(); }
    const admin = document.createElement('a'); admin.href = '../../../../../admin-demo/index.html'; admin.textContent = '⚙ Admin';
    admin.style.color = '#fff'; admin.target = '_blank'; admin.rel = 'noopener';
    bar.append(label, note, ...(peak ? [jump] : []), admin); document.body.append(bar);
  });
})({"dates":["2026-10-01","2026-10-02","2026-10-03","2026-10-04","2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09","2026-10-10","2026-10-11","2026-10-12","2026-10-13","2026-10-14","2026-10-15","2026-10-16","2026-10-17","2026-10-18","2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-25","2026-10-26","2026-10-27","2026-10-28","2026-11-03","2026-11-04","2026-11-10","2026-11-11","2026-11-17","2026-11-18","2026-11-24","2026-11-25"],"weeks":[{"start":"2026-09-27","end":"2026-10-01","label":"צרפת · פריז"},{"start":"2026-10-04","end":"2026-10-08","label":"איטליה · מילאנו"},{"start":"2026-10-11","end":"2026-10-15","label":"מרוקו · מרקש"},{"start":"2026-10-18","end":"2026-10-22","label":"ארה״ב · לאס וגאס"},{"start":"2026-10-25","end":"2026-10-29","label":"מקסיקו · קנקון"},{"start":"2026-11-01","end":"2026-11-05","label":"יפן · טוקיו"},{"start":"2026-11-08","end":"2026-11-12","label":"יוון · אתונה"},{"start":"2026-11-15","end":"2026-11-19","label":"הודו · ניו דלהי"},{"start":"2026-11-22","end":"2026-11-26","label":"ישראל · ירושלים"}],"peaks":["2026-10-01","2026-10-07","2026-10-14","2026-10-21","2026-10-28","2026-11-04","2026-11-11","2026-11-18","2026-11-25"],"period":{"start":"2026-09-27","end":"2026-11-26","closeBy":"2026-11-26","_closeBy_note":"Uploaded rulebook: closures/signatures within contest period. No January grace period configured."},"dataTo":"2026-10-25"});
