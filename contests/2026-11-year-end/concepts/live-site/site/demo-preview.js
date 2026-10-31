(function cityPreview(cities, groups) {
  const params = new URLSearchParams(location.search);
  const requested = Number(params.get('demoWeek') || 1);
  const week = Number.isInteger(requested) && requested >= 1 && requested <= cities.length ? requested : 1;
  window.PREVIEW = true; // Keep the selected city snapshot stable; do not poll the default data.js.
  window.SITE_SYNC = false; // This public preview must use only its selected synthetic snapshot.
  document.write('<script src="demo-data/week-' + week + '.js"><\/script>');
  const store = (f) => { try { return f(); } catch { return null; } };
  addEventListener('DOMContentLoaded', () => {
    const box = document.createElement('div'); box.id = 'demo-bar'; box.dir = 'rtl';
    box.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:2147483647;display:grid;gap:8px;max-width:calc(100vw - 24px);padding:10px 14px;border-radius:16px;background:#11152b;color:#fff;box-shadow:0 4px 20px #0005;font:700 14px Simpler,Arial,sans-serif;box-sizing:border-box';
    const style = document.createElement('style');
    style.textContent = 'body:has(.peak-open:not(.out)) #demo-bar{display:none!important}#demo-bar .demo-roles{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;border:0}#demo-bar .demo-roles legend{padding:0;margin-bottom:6px;float:right;width:100%}#demo-bar .demo-roles button{min-height:44px;padding:0 12px;border:1.5px solid #fff;border-radius:22px;background:transparent;color:#fff;font:inherit;font-weight:400;cursor:pointer}#demo-bar .demo-roles button[aria-pressed=true]{background:#fff;color:#11152b;font-weight:700}#demo-bar .demo-roles button:disabled{opacity:.55;cursor:not-allowed}#demo-bar :focus-visible{outline:3px solid #fff;outline-offset:2px}#demo-bar{max-height:calc(100svh - 24px);overflow:auto}#demo-bar .demo-role-pick{display:none;min-height:44px;font:inherit;font-weight:400;color:#11152b;background:#fff;border-radius:8px;padding:0 8px;max-width:100%}@media (max-width:400px){#demo-bar .demo-roles button[data-demo-role]{display:none}#demo-bar .demo-role-pick{display:block;width:100%}}#demo-bar .demo-general{min-height:44px;padding:0 12px;border:1.5px solid #fff;border-radius:22px;background:transparent;color:#fff;font:inherit;cursor:pointer}#demo-bar .demo-general[aria-pressed=true]{background:#fff;color:#11152b;font-weight:700}';
    document.head.append(style);
    const bar = document.createElement('label');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px';
    bar.append('עיר להדגמה');
    const select = document.createElement('select'); select.id = 'demo-city'; select.setAttribute('aria-label', 'בחירת עיר להדגמה');
    select.style.cssText = 'font:inherit;max-width:65vw;color:#11152b;background:#fff;border-radius:8px;padding:8px';
    cities.forEach((city, i) => select.add(new Option((i + 1) + ' · ' + city, String(i + 1))));
    select.value = String(week);
    select.addEventListener('change', () => { const url = new URL(location.href); url.searchParams.set('demoWeek', select.value); location.assign(url); });
    bar.append(select);
    const me = store(() => localStorage.getItem('gh:me')), staff = store(() => localStorage.getItem('gh:staff'));
    const pick = (r) => {
      store(() => { localStorage.removeItem('gh:me'); localStorage.removeItem('gh:staff');
        if (r.me) { localStorage.setItem('gh:me', r.me); sessionStorage.setItem('gh:pass-issued:' + r.me, '1'); }
        if (r.staff) localStorage.setItem('gh:staff', r.staff); });
      location.reload();
    };
    const isOn = (r) => (r.me ? me === r.me : r.staff ? staff === r.staff : false);
    const general = document.createElement('button'); general.type = 'button'; general.className = 'demo-general'; general.textContent = 'כללי';
    general.dataset.demoGeneral = ''; general.setAttribute('aria-pressed', String(!me && !staff)); general.addEventListener('click', () => pick({}));
    bar.append(general);
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
    box.append(bar, ...rows); document.body.append(box);
  });
})(["צרפת · פריז","איטליה · מילאנו","מרוקו · מרקש","ארה״ב · לאס וגאס","מקסיקו · קנקון","יפן · טוקיו","יוון · אתונה","הודו · ניו דלהי","ישראל · ירושלים"],[{"label":"נציגים","roles":[{"label":"נציג/ה מוקד סוהו","me":"k74fb8286fadcdb7de5937bde"},{"label":"סוכן/ת שטח סוהו","me":"kd1f5a06a558a6af757d01bf1"},{"label":"טלמיטינג סוהו / שטח","me":"kd2dc32628b5bb9b3cbc6cd77"},{"label":"שירות סוהו","me":"k412fc8c96c88602507c53035"},{"label":"מכירות פרסום דיגיטלי","me":"k5b1e6f1ecf6533754e5a9a51"},{"label":"שירות פרסום דיגיטלי (מכירה)","me":"ka2bbbf4e5d89d4f1a71bd8ef"},{"label":"מעבירי לידים 144 · ברירת מחדל עד החלטה","me":"k87ba8f07b3409fd994b69156"},{"label":"מכירות חשמל","me":"k05c7700517bfa11b4ec4adf3"},{"label":"גיוס עסקי חשמל","me":"ka90bcc27620442e9e48f22e4"},{"label":"שירות חשמל","me":"k30569bf603265d934e7b3912"},{"label":"גיוס מחדש חשמל","me":"kf462a6fd50c8034aa19a9566"},{"label":"תומכי מכירה","missing":"L545–549 · טרם נבנה / ממתין להחלטה"},{"label":"העברת לידים","missing":"L555–559 · טרם נבנה / ממתין להחלטה"},{"label":"חניכה","missing":"L575 · טרם נבנה / ממתין להחלטה"}]},{"label":"ראשי צוות","roles":[{"label":"ראש צוות · מכירות סוהו ושטח","staff":"k10451b93560bca6fdc6c0607"},{"label":"ראש צוות · שירות סוהו","staff":"kbe05851cf0a7c2118b981458"},{"label":"ראש צוות · פרסום","staff":"k2728beec29d2736556602821"},{"label":"ראש צוות · חשמל","staff":"k0b992c0a13fba6822c4126b9"}]},{"label":"מנהלים","roles":[{"label":"מנהל/ת מחלקה · מוקד סוהו","staff":"k1457dee322e31d60bdb0aaa3"},{"label":"מנהל/ת מחלקה · מוקד 144 חיפה","staff":"k55d213cdcc48a005d75cd6fd"},{"label":"מנהל/ת מחלקה · פרסום דיגיטלי תל אביב","staff":"kcedc36deb979d50ccd187a39"},{"label":"מנהל/ת מחלקה · מוקד חשמל","staff":"ka3d65daa2139985739a2153f"},{"label":"מנהל/ת אגף","staff":"k319937d017ddeaf01fc8fa2a"}]}]);
