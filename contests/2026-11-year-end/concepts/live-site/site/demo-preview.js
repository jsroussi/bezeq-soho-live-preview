(function cityPreview(cities, groups) {
  const params = new URLSearchParams(location.search);
  const requested = Number(params.get('demoWeek') || 1);
  const week = Number.isInteger(requested) && requested >= 1 && requested <= cities.length ? requested : 1;
  window.PREVIEW = true; // Keep the selected city snapshot stable; do not poll the default data.js.
  window.SITE_SYNC = false; // This public preview must use only its selected synthetic snapshot.
  document.write('<script src="demo-data/week-' + week + '.js"><\/script>');
  const store = (f) => { try { return f(); } catch { return null; } };
  addEventListener('DOMContentLoaded', () => {
    // PV-4 (owner's phone, 31.10): the bar is a slim toggle "תצוגה: {role} · {city} ▾"; open, it is the panel (city,
    // "כללי", the role groups): on phones (≤ 480 px) a bottom sheet (≤ 70% of the height, scrolling inside, a scrim behind;
    // "סגירה", a tap outside or Esc close it, focus back on the toggle), on desktop the box beside the page with
    // "הסתר". Phones start closed, desktop open; the choice is kept for the session. Picking a role or a city reloads.
    const phone = matchMedia('(max-width: 480px)'), KEY = 'demo-bar:open';
    const box = document.createElement('div'); box.id = 'demo-bar'; box.dir = 'rtl';
    const style = document.createElement('style');
    style.textContent = 'body:has(.peak-open:not(.out)) :is(#demo-bar,#demo-scrim){display:none!important}'
      + '#demo-bar{position:fixed;bottom:12px;left:12px;z-index:2147483647;max-width:calc(100vw - 24px);color:#fff;font:700 14px Simpler,Arial,sans-serif;box-sizing:border-box}'
      + '#demo-bar .demo-toggle{display:flex;align-items:center;gap:8px;min-height:44px;max-width:100%;padding:0 16px;border:0;border-radius:22px;background:#11152b;color:#fff;font:inherit;box-shadow:0 4px 20px #0005;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '#demo-bar .demo-panel{display:grid;gap:8px;padding:10px 14px;border-radius:16px;background:#11152b;box-shadow:0 4px 20px #0005;max-height:calc(100svh - 24px);overflow:auto;box-sizing:border-box}'
      + '#demo-bar[data-open="1"] .demo-toggle,#demo-bar:not([data-open="1"]) .demo-panel{display:none}'
      + '#demo-scrim{position:fixed;inset:0;z-index:2147483646;background:rgb(0 0 0 / .45)}'
      + '#demo-bar .demo-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#demo-bar .demo-head label{display:flex;align-items:center;gap:8px}'
      + '#demo-bar .demo-close{margin-inline-start:auto;min-height:44px;padding:0 14px;border:1.5px solid #fff;border-radius:22px;background:transparent;color:#fff;font:inherit;cursor:pointer}'
      + '#demo-bar #demo-city{font:inherit;max-width:65vw;min-height:44px;color:#11152b;background:#fff;border-radius:8px;padding:0 8px}'
      + '#demo-bar .demo-roles{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;border:0}#demo-bar .demo-roles legend{padding:0;margin-bottom:6px;float:right;width:100%}'
      + '#demo-bar .demo-roles button{min-height:44px;padding:0 12px;border:1.5px solid #fff;border-radius:22px;background:transparent;color:#fff;font:inherit;font-weight:400;cursor:pointer}'
      + '#demo-bar .demo-roles button[aria-pressed=true]{background:#fff;color:#11152b;font-weight:700}#demo-bar .demo-roles button:disabled{opacity:.55;cursor:not-allowed}#demo-bar :focus-visible{outline:3px solid #fff;outline-offset:2px}'
      + '#demo-bar .demo-role-pick{display:none;min-height:44px;font:inherit;font-weight:400;color:#11152b;background:#fff;border-radius:8px;padding:0 8px;max-width:100%}'
      + '#demo-bar .demo-general{min-height:44px;padding:0 12px;border:1.5px solid #fff;border-radius:22px;background:transparent;color:#fff;font:inherit;cursor:pointer}#demo-bar .demo-general[aria-pressed=true]{background:#fff;color:#11152b;font-weight:700}'
      + '@media (max-width:480px){#demo-bar .demo-roles button[data-demo-role]{display:none}#demo-bar .demo-role-pick{display:block;width:100%}'
      + '#demo-bar[data-open="1"]{inset:auto 0 0 0;max-width:none}#demo-bar[data-open="1"] .demo-panel{max-height:70svh;border-radius:20px 20px 0 0;padding-bottom:max(14px,env(safe-area-inset-bottom))}}';
    document.head.append(style);
    const me = store(() => localStorage.getItem('gh:me')), staff = store(() => localStorage.getItem('gh:staff'));
    const pick = (r) => {
      store(() => { localStorage.removeItem('gh:me'); localStorage.removeItem('gh:staff');
        if (r.me) { localStorage.setItem('gh:me', r.me); sessionStorage.setItem('gh:pass-issued:' + r.me, '1'); }
        if (r.staff) localStorage.setItem('gh:staff', r.staff);
        if (phone.matches) sessionStorage.setItem(KEY, '0'); });
      location.reload();
    };
    const isOn = (r) => (r.me ? me === r.me : r.staff ? staff === r.staff : false);
    const current = groups.flatMap((g) => g.roles).find(isOn)?.label ?? 'כללי';
    // The slim toggle, and the panel it opens.
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'demo-toggle'; toggle.dataset.demoToggle = '';
    toggle.setAttribute('aria-controls', 'demo-panel'); toggle.textContent = 'תצוגה: ' + current + ' · ' + cities[week - 1] + ' ▾';
    const panel = document.createElement('div'); panel.className = 'demo-panel'; panel.id = 'demo-panel';
    panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'תצוגה לפי תפקיד ועיר');
    const head = document.createElement('div'); head.className = 'demo-head';
    const cityLabel = document.createElement('label'); cityLabel.append('עיר להדגמה');
    const select = document.createElement('select'); select.id = 'demo-city'; select.setAttribute('aria-label', 'בחירת עיר להדגמה');
    cities.forEach((city, i) => select.add(new Option((i + 1) + ' · ' + city, String(i + 1))));
    select.value = String(week);
    select.addEventListener('change', () => { store(() => { if (phone.matches) sessionStorage.setItem(KEY, '0'); }); const url = new URL(location.href); url.searchParams.set('demoWeek', select.value); location.assign(url); });
    cityLabel.append(select);
    const general = document.createElement('button'); general.type = 'button'; general.className = 'demo-general'; general.textContent = 'כללי';
    general.dataset.demoGeneral = ''; general.setAttribute('aria-pressed', String(!me && !staff)); general.addEventListener('click', () => pick({}));
    const close = document.createElement('button'); close.type = 'button'; close.className = 'demo-close'; close.dataset.demoClose = '';
    head.append(cityLabel, general, close);
    const rows = groups.map((g) => {
      const row = document.createElement('fieldset'); row.className = 'demo-roles';
      const legend = document.createElement('legend'); legend.textContent = 'תצוגה לפי תפקיד · ' + g.label; row.append(legend);
      const sel = document.createElement('select'); sel.className = 'demo-role-pick'; sel.setAttribute('aria-label', 'תצוגה לפי תפקיד · ' + g.label);
      sel.add(new Option('בחירה…', ''));
      g.roles.forEach((r, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = r.label; b.dataset.demoRole = r.label;
        b.setAttribute('aria-pressed', String(isOn(r)));
        const o = new Option(r.missing ? r.label + ' · ' + r.missing : r.label, String(i));
        if (r.missing) { b.disabled = true; b.textContent = r.label + ' · ' + r.missing; o.disabled = true; }
        else b.addEventListener('click', () => pick(r));
        if (isOn(r)) o.selected = true;
        sel.add(o); row.append(b);
      });
      sel.addEventListener('change', () => { const r = g.roles[Number(sel.value)]; if (r && !r.missing) pick(r); });
      row.append(sel);
      return row;
    });
    panel.append(head, ...rows);
    const scrim = document.createElement('div'); scrim.id = 'demo-scrim'; scrim.hidden = true;
    const setOpen = (open, focus) => {
      box.dataset.open = open ? '1' : '0'; toggle.setAttribute('aria-expanded', String(open));
      close.textContent = phone.matches ? 'סגירה' : 'הסתר';
      scrim.hidden = !(open && phone.matches);
      store(() => sessionStorage.setItem(KEY, open ? '1' : '0'));
      if (focus) (open ? close : toggle).focus();
    };
    toggle.addEventListener('click', () => setOpen(true, true));
    close.addEventListener('click', () => setOpen(false, true));
    scrim.addEventListener('click', () => setOpen(false, true));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && box.dataset.open === '1') setOpen(false, true); });
    phone.addEventListener('change', () => setOpen(box.dataset.open === '1'));
    const kept = store(() => sessionStorage.getItem(KEY));
    box.append(toggle, panel); document.body.append(scrim, box);
    setOpen(kept == null ? !phone.matches : kept === '1');
  });
})(["צרפת · פריז","איטליה · מילאנו","מרוקו · מרקש","ארה״ב · לאס וגאס","מקסיקו · קנקון","יפן · טוקיו","יוון · אתונה","הודו · ניו דלהי","ישראל · ירושלים"],[{"label":"נציגים","roles":[{"label":"נציג/ה מוקד סוהו","me":"k74fb8286fadcdb7de5937bde"},{"label":"סוכן/ת שטח סוהו","me":"kd1f5a06a558a6af757d01bf1"},{"label":"טלמיטינג סוהו / שטח","me":"kd2dc32628b5bb9b3cbc6cd77"},{"label":"שירות סוהו","me":"k412fc8c96c88602507c53035"},{"label":"מכירות פרסום דיגיטלי","me":"k5b1e6f1ecf6533754e5a9a51"},{"label":"שירות פרסום דיגיטלי (מכירה)","me":"ka2bbbf4e5d89d4f1a71bd8ef"},{"label":"מעבירי לידים 144 · ברירת מחדל עד החלטה","me":"k87ba8f07b3409fd994b69156"},{"label":"מכירות חשמל","me":"k05c7700517bfa11b4ec4adf3"},{"label":"גיוס עסקי חשמל","me":"ka90bcc27620442e9e48f22e4"},{"label":"שירות חשמל","me":"k30569bf603265d934e7b3912"},{"label":"גיוס מחדש חשמל","me":"kf462a6fd50c8034aa19a9566"},{"label":"תומכי מכירה","missing":"L545–549 · טרם נבנה / ממתין להחלטה"},{"label":"העברת לידים","missing":"L555–559 · טרם נבנה / ממתין להחלטה"},{"label":"חניכה","missing":"L575 · טרם נבנה / ממתין להחלטה"}]},{"label":"ראשי צוות","roles":[{"label":"ראש צוות · מכירות סוהו ושטח","staff":"k10451b93560bca6fdc6c0607"},{"label":"ראש צוות · שירות סוהו","staff":"kbe05851cf0a7c2118b981458"},{"label":"ראש צוות · פרסום","staff":"k2728beec29d2736556602821"},{"label":"ראש צוות · חשמל","staff":"k0b992c0a13fba6822c4126b9"}]},{"label":"מנהלים","roles":[{"label":"מנהל/ת מחלקה · מוקד סוהו","staff":"k1457dee322e31d60bdb0aaa3"},{"label":"מנהל/ת מחלקה · מוקד 144 חיפה","staff":"k55d213cdcc48a005d75cd6fd"},{"label":"מנהל/ת מחלקה · פרסום דיגיטלי תל אביב","staff":"kcedc36deb979d50ccd187a39"},{"label":"מנהל/ת מחלקה · מוקד חשמל","staff":"ka3d65daa2139985739a2153f"},{"label":"מנהל/ת אגף","staff":"k319937d017ddeaf01fc8fa2a"}]}]);
