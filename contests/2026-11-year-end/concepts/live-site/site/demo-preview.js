(function cityPreview(cities) {
  const params = new URLSearchParams(location.search);
  const requested = Number(params.get('demoWeek') || 1);
  const week = Number.isInteger(requested) && requested >= 1 && requested <= cities.length ? requested : 1;
  window.PREVIEW = true; // Keep the selected city snapshot stable; do not poll the default data.js.
  window.SITE_SYNC = false; // This public preview must use only its selected synthetic snapshot.
  document.write('<script src="demo-data/week-' + week + '.js"><\/script>');
  addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('label');
    bar.dir = 'rtl';
    bar.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:2147483647;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 24px);padding:10px 14px;border-radius:16px;background:#11152b;color:#fff;box-shadow:0 4px 20px #0005;font:600 14px Arial';
    bar.append('עיר להדגמה');
    const select = document.createElement('select'); select.id = 'demo-city'; select.setAttribute('aria-label', 'בחירת עיר להדגמה');
    select.style.cssText = 'font:inherit;max-width:65vw;color:#11152b;background:#fff;border-radius:8px;padding:8px';
    cities.forEach((city, i) => select.add(new Option((i + 1) + ' · ' + city, String(i + 1))));
    select.value = String(week);
    select.addEventListener('change', () => { const url = new URL(location.href); url.searchParams.set('demoWeek', select.value); location.assign(url); });
    const admin = document.createElement('a');
    admin.href = '../../../../../admin-demo/index.html'; admin.textContent = '⚙ Admin';
    admin.style.color = '#fff'; admin.target = '_blank'; admin.rel = 'noopener';
    bar.append(select, admin); document.body.append(bar);
  });
})(["צרפת · פריז","איטליה · מילאנו","מרוקו · מרקש","ארה״ב · לאס וגאס","מקסיקו · קנקון","יפן · טוקיו","יוון · אתונה","הודו · ניו דלהי","ישראל · ירושלים"]);
