// Week themes: the cinematic layer only. The Bezeq shell (nav, cards, tables, buttons) never reads these.
// Shape: { order, country, city, lat, lng, dates, image, palette, accent, motion, peakDay }
//   dates     Sun–Thu, ISO
//   palette   base = background of the cinematic layer, then the three named colours of the week
//   seal      stamp colour on the boarding pass (white text on it passes 4.5:1)
//   accent    highlight on `base` (route, active city, numerals); must pass 4.5:1 on base
//   motion    how this destination moves: flight duration (s), arc lift, ease, title reveal
//   peakDay   yom shia: date, theme, image, palette, prize (empty slot until the budget is approved)
// Images are files in /images (no CDN). Credits: images/CREDITS.md
window.WEEKS = [
  {
    order: 1, code: 'PAR', seal: '#6B1E2E', country: 'צרפת', city: 'פריז', latin: 'Paris · France',
    lat: 48.8566, lng: 2.3522, dates: ['2026-11-01', '2026-11-05'],
    image: 'images/paris.jpg', imagePos: '50% 50%',
    palette: { base: '#1E0910', a: '#E8D3A8', b: '#6B1E2E', c: '#F6F1E6', names: ['שמפניה', 'בורדו', 'שנהב'] },
    accent: '#E8D3A8',
    motion: { flight: 2.2, lift: 0.7, ease: 'sine.inOut', reveal: 'soft' },
    peakDay: { date: '2026-11-04', theme: 'השקה פריזאית', short: 'השקה פריזאית',
      image: 'images/paris-peak.jpg', imagePos: '50% 50%',
      palette: { base: '#12050A', a: '#6B1E2E', b: '#E8D3A8', c: '#F6F1E6' }, prize: null },
  },
  {
    order: 2, code: 'MIL', seal: '#0E5E4A', country: 'איטליה', city: 'מילאנו', latin: 'Milano · Italia',
    lat: 45.4642, lng: 9.19, dates: ['2026-11-08', '2026-11-12'],
    image: 'images/milan.jpg', imagePos: '50% 40%',
    palette: { base: '#07110D', a: '#0E5E4A', b: '#0B0D0C', c: '#C9A24A', names: ['אמרלד', 'שחור', 'זהב'] },
    accent: '#D9B65E',
    motion: { flight: 2.6, lift: 0.9, ease: 'power3.inOut', reveal: 'tailored' },
    peakDay: { date: '2026-11-11', theme: 'יום הסטייל של מילאנו', short: 'יום הסטייל',
      image: 'images/milan-peak.jpg', imagePos: '50% 45%',
      palette: { base: '#050807', a: '#0E5E4A', b: '#C9A24A', c: '#F3EBDD' }, prize: null },
  },
  {
    order: 3, code: 'RAK', seal: '#A44C2B', country: 'מרוקו', city: 'מרקש', latin: 'Marrakech · المغرب',
    lat: 31.6295, lng: -7.9811, dates: ['2026-11-15', '2026-11-19'],
    image: 'images/marrakech.jpg', imagePos: '50% 30%',
    palette: { base: '#241008', a: '#C2603A', b: '#2F8F7A', c: '#B8913F', names: ['טרקוטה', 'ירקן', 'פליז'] },
    accent: '#E39A6B',
    motion: { flight: 2.8, lift: 0.8, ease: 'power2.inOut', reveal: 'warm' },
    peakDay: { date: '2026-11-18', theme: 'השוק של מרקש', short: 'השוק של מרקש',
      image: 'images/marrakech-peak.jpg', imagePos: '50% 60%',
      palette: { base: '#1A0B05', a: '#2F8F7A', b: '#C2603A', c: '#E9C77B' }, prize: null },
  },
  {
    order: 4, code: 'LAS', seal: '#6A1FE0', country: 'ארה״ב', city: 'לאס וגאס', latin: 'Las Vegas · USA',
    lat: 36.1147, lng: -115.1728, dates: ['2026-11-22', '2026-11-26'],
    image: 'images/vegas.jpg', imagePos: '50% 50%',
    palette: { base: '#10052A', a: '#7A2BFF', b: '#FF2E93', c: '#F2C14E', names: ['סגול חשמלי', 'ורוד לוהט', 'זהב'] },
    accent: '#FF5AAA',
    motion: { flight: 2.4, lift: 0.8, ease: 'expo.inOut', reveal: 'strobe' },
    peakDay: { date: '2026-11-25', theme: 'האתגר של וגאס', short: 'האתגר של וגאס',
      image: 'images/vegas-peak.jpg', imagePos: '50% 50%',
      palette: { base: '#0A0320', a: '#FF2E93', b: '#7A2BFF', c: '#F2C14E' }, prize: null },
  },
  {
    order: 5, code: 'CUN', seal: '#0F7F7B', country: 'מקסיקו', city: 'קנקון', latin: 'Cancún · México',
    lat: 21.1619, lng: -86.8515, dates: ['2026-11-29', '2026-12-03'],
    image: 'images/cancun.jpg', imagePos: '50% 50%',
    palette: { base: '#042A2E', a: '#19B5B0', b: '#FF6F5E', c: '#E9D8B4', names: ['טורקיז', 'קורל', 'חול'] },
    accent: '#FF8A7A',
    motion: { flight: 3.4, lift: 1.3, ease: 'power2.inOut', reveal: 'breeze' },
    peakDay: { date: '2026-12-02', theme: 'בריחה לקנקון', short: 'בריחה לקנקון',
      image: 'images/cancun-peak.jpg', imagePos: '50% 50%',
      palette: { base: '#03201F', a: '#FF6F5E', b: '#19B5B0', c: '#E9D8B4' }, prize: null },
  },
  {
    order: 6, code: 'TYO', seal: '#C2311B', country: 'יפן', city: 'טוקיו', latin: 'Tokyo · 東京',
    lat: 35.6595, lng: 139.7005, dates: ['2026-12-06', '2026-12-10'],
    image: 'images/tokyo.jpg', imagePos: '50% 50%',
    palette: { base: '#0A0B11', a: '#E8452C', b: '#14161F', c: '#2DE2E6', names: ['אדום ורמיליון', 'דיו', 'ציאן ניאון'] },
    accent: '#2DE2E6',
    motion: { flight: 3.8, lift: 1.4, ease: 'power4.inOut', reveal: 'snap' },
    peakDay: { date: '2026-12-09', theme: 'הדיוק של טוקיו', short: 'הדיוק של טוקיו',
      image: 'images/tokyo-peak.jpg', imagePos: '50% 55%',
      palette: { base: '#07080D', a: '#E8452C', b: '#2DE2E6', c: '#F4EFE6' }, prize: null },
  },
  {
    order: 7, code: 'ATH', seal: '#9C4425', country: 'יוון', city: 'אתונה', latin: 'Athens · Αθήνα',
    lat: 37.9715, lng: 23.7257, dates: ['2026-12-13', '2026-12-17'],
    image: 'images/athens.jpg', imagePos: '50% 50%',
    palette: { base: '#121A22', a: '#C8643B', b: '#7D8B5C', c: '#F1ECE2', names: ['טרקוטה', 'זית', 'שיש'] },
    accent: '#E9C46A',
    motion: { flight: 2.2, lift: 0.6, ease: 'power2.inOut', reveal: 'warm' },
    peakDay: { date: '2026-12-16', theme: 'האקרופוליס נדלק', short: 'האקרופוליס נדלק', draft: true,
      image: 'images/athens-peak.jpg', imagePos: '50% 50%',
      palette: { base: '#0C1117', a: '#C8643B', b: '#E9C46A', c: '#F1ECE2' }, prize: null },
  },
  {
    order: 8, code: 'DEL', seal: '#0F5E63', country: 'הודו', city: 'ניו דלהי', latin: 'New Delhi · नई दिल्ली',
    lat: 28.6129, lng: 77.2295, dates: ['2026-12-20', '2026-12-24'],
    image: 'images/new-delhi.jpg', imagePos: '50% 50%',
    palette: { base: '#0B2224', a: '#E58FA0', b: '#F4A230', c: '#0F5E63', names: ['ורוד', 'זעפרן', 'טורקיז'] },
    accent: '#F4A230',
    motion: { flight: 2.4, lift: 0.7, ease: 'power2.inOut', reveal: 'ornate' },
    peakDay: { date: '2026-12-23', theme: 'הצבעים של הודו', short: 'הצבעים של הודו',
      image: 'images/new-delhi-peak.jpg', imagePos: '50% 50%',
      palette: { base: '#0E1030', a: '#F29F1D', b: '#D98F86', c: '#F3E3D3' }, prize: null },
  },
  {
    order: 9, code: 'JRS', seal: '#86651D', country: 'ישראל', city: 'ירושלים', latin: 'Jerusalem · ירושלים',
    lat: 31.7767, lng: 35.2345, dates: ['2026-12-27', '2026-12-31'],
    image: 'images/jerusalem.jpg', imagePos: '50% 50%',
    palette: { base: '#0A1230', a: '#D4A64B', b: '#E9DFC9', c: '#0F1B3D', names: ['זהב ירושלמי', 'אבן גיר', 'כחול חצות'] },
    accent: '#E2B85E',
    motion: { flight: 2.6, lift: 0.8, ease: 'power3.inOut', reveal: 'solemn' },
    peakDay: { date: '2026-12-31', theme: 'חוזרים הביתה', short: 'חוזרים הביתה',
      image: 'images/jerusalem.jpg', imagePos: '30% 70%',
      palette: { base: '#070D24', a: '#D4A64B', b: '#E9DFC9', c: '#F6EFDC' }, prize: null },
  },
];

// The route starts and ends at home: the departure leg is Jerusalem → Paris.
window.ROUTE_ORIGIN = { code: 'JRS', seal: '#86651D', lat: 31.7767, lng: 35.2345 };

// The admin page's weeks table (../_shared/admin-weeks.js, loaded before this file): the weeks in the table's order,
// with its country, city, dates and peak-day title ("יום שיא בסגנון <country>" until one is entered, tbd). The demo
// plays a peak day on its date, so a week without one in the admin page keeps its Wednesday.
if (window.ADMIN_WEEKS) {
  window.WEEKS = window.ADMIN_WEEKS.arrange(window.WEEKS, function (w) { return w.city; }).map(function (w, i) {
    var row = window.ADMIN_WEEKS.weeks[i], wed = new Date(row.start + 'T12:00:00Z');
    wed.setUTCDate(wed.getUTCDate() + 3);
    var peak = Object.assign({}, w.peakDay, { date: row.peak.date || wed.toISOString().slice(0, 10), theme: row.peak.title, short: row.peak.title, tbd: row.peak.tbd, draft: false });
    return Object.assign({}, w, { order: i + 1, city: row.he, country: row.country, dates: [row.start, row.end], peakDay: peak });
  });
}
