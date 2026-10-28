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
  // The real data is encrypted (AES-256-GCM, key from the password by PBKDF2). The password itself is never stored:
  // the derived key is kept as a NON-extractable CryptoKey in IndexedDB for 7 days, and the bar has a lock button.
  const DB = 'soho-preview', TTL = 7 * 864e5;
  const idb = (mode, fn) => new Promise((ok, bad) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onerror = () => bad(r.error); r.onsuccess = () => { const tx = r.result.transaction('k', mode); const q = fn(tx.objectStore('k')); tx.oncomplete = () => ok(q && q.result); tx.onerror = () => bad(tx.error); }; });
  const saveKey = (key) => idb('readwrite', (s) => s.put({ key, until: Date.now() + TTL }, 'key')).catch(() => {});
  const loadKey = async () => { try { const v = await idb('readonly', (s) => s.get('key')); return v && v.until > Date.now() ? v.key : null; } catch { return null; } };
  const forget = () => idb('readwrite', (s) => s.delete('key')).catch(() => {});
  try { localStorage.removeItem('soho-preview-pw'); } catch {} // the first version kept the password itself; clear it
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function derive(pw) {
    const meta = await (await fetch('demo-days/key.json', { cache: 'no-store' })).json();
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(meta.salt), iterations: meta.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }
  async function unlock(key) {
    const blob = b64((await (await fetch('demo-days/day-' + day + '.enc', { cache: 'no-store' })).text()).trim());
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: blob.slice(0, 12) }, key, blob.slice(12)));
  }
  const load = (src) => new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = bad; document.body.append(s); });
  async function start(text) {
    const s = document.createElement('script'); s.textContent = text; document.head.append(s);
    for (const src of window.PREVIEW_SCRIPTS || []) await load(src);
  }
  function gate(error) {
    const g = document.createElement('div'); g.dir = 'rtl'; g.id = 'preview-gate';
    g.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#20294D;color:#fff;font:600 16px Arial;padding:16px';
    g.innerHTML = '<form style="display:grid;gap:12px;width:min(340px,100%);text-align:center"><b style="font-size:22px">60 יום מסביב לעולם</b><span style="font-weight:400;opacity:.85">תצוגה מקדימה פנימית · נדרשת סיסמה</span><input type="password" autocomplete="current-password" aria-label="סיסמה" style="font:inherit;padding:12px;border-radius:10px;border:0;color:#20294D;text-align:center"><button style="font:inherit;padding:12px;border-radius:10px;border:0;background:#fff;color:#20294D;cursor:pointer">כניסה</button><small role="alert" style="min-height:1.2em;color:#ffb3b3;font-weight:400"></small></form>';
    const f = g.querySelector('form'), input = g.querySelector('input'), msg = g.querySelector('small');
    if (error) msg.textContent = error;
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.textContent = 'פותח…';
      try { const key = await derive(input.value); const text = await unlock(key); await saveKey(key); g.remove(); await start(text); }
      catch { msg.textContent = 'הסיסמה שגויה'; input.select(); }
    });
    document.body.append(g); input.focus();
  }
  addEventListener('DOMContentLoaded', async () => {
    const saved = await loadKey();
    if (saved) { try { await start(await unlock(saved)); return; } catch { await forget(); } }
    gate();
  });
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
    const lock = document.createElement('button'); lock.type = 'button'; lock.textContent = '🔒 נעילה'; lock.style.cssText = 'font:inherit;color:#fff;background:#ffffff1f;border:0;border-radius:999px;padding:6px 12px;cursor:pointer'; lock.addEventListener('click', async () => { await forget(); location.reload(); });
    bar.append(label, note, ...(peak ? [jump] : []), admin, lock); document.body.append(bar);
  });
})({"dates":["2026-10-01","2026-10-02","2026-10-03","2026-10-04","2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09","2026-10-10","2026-10-11","2026-10-12","2026-10-13","2026-10-14","2026-10-15","2026-10-16","2026-10-17","2026-10-18","2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-25","2026-10-26","2026-10-27","2026-10-28","2026-11-03","2026-11-04","2026-11-10","2026-11-11","2026-11-17","2026-11-18","2026-11-24","2026-11-25"],"weeks":[{"start":"2026-09-27","end":"2026-10-01","label":"צרפת · פריז"},{"start":"2026-10-04","end":"2026-10-08","label":"איטליה · ונציה"},{"start":"2026-10-11","end":"2026-10-15","label":"מרוקו · מרקש"},{"start":"2026-10-18","end":"2026-10-22","label":"ארה״ב · לאס וגאס"},{"start":"2026-10-25","end":"2026-10-29","label":"מקסיקו · קנקון"},{"start":"2026-11-01","end":"2026-11-05","label":"יפן · טוקיו"},{"start":"2026-11-08","end":"2026-11-12","label":"יוון · אתונה"},{"start":"2026-11-15","end":"2026-11-19","label":"הודו · ניו דלהי"},{"start":"2026-11-22","end":"2026-11-26","label":"ישראל · ירושלים"}],"peaks":["2026-10-01","2026-10-07","2026-10-14","2026-10-21","2026-10-28","2026-11-04","2026-11-11","2026-11-18","2026-11-25"],"period":{"start":"2026-09-27","end":"2026-11-26","closeBy":"2026-11-26","_closeBy_note":"Uploaded rulebook: closures/signatures within contest period. No January grace period configured."},"dataTo":"2026-10-25"});
