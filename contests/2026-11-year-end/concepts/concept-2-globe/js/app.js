// קד״מ סוף שנה 2026: page controller. Classic script, runs from file://.
// Reads window.CONTEST_DATA (data.js) and window.WEEKS (weeks.js), scores with window.Engine,
// drives the cinematic layer (globe, photo, peak takeover) and renders the Bezeq shell (pass, KPIs, boards).
//
// Demo URL parameters (ignored in normal use): ?asOf=2026-11-18 &week=3 &rep=<name> &mode=globe &motion=0
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var data = window.CONTEST_DATA, weeks = window.WEEKS;
  var asOf = params.get('asOf') || data.asOf;
  var E = Engine.evaluate(data, weeks, asOf);
  var reduced = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || params.get('motion') === '0';

  var current = E.week ? E.week.order - 1 : 0;
  var peakToday = weeks[current].peakDay.date === asOf;
  var started = asOf >= data.config.period.start;

  // ───────────── formatting
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dm = function (iso) { var p = iso.split('-'); return +p[2] + '.' + +p[1]; };
  var dayName = function (iso) { return DAYS[new Date(iso + 'T00:00:00Z').getUTCDay()]; };
  function range(d) {
    var a = d[0].split('-'), b = d[1].split('-');
    return a[1] === b[1] ? +a[2] + '–' + +b[2] + '.' + +b[1] : dm(d[0]) + '–' + dm(d[1]);
  }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var pct = function (x) { return x == null ? '—' : Math.round(x * 100); };
  function coord(w) {
    return Math.abs(w.lat).toFixed(2) + '°' + (w.lat >= 0 ? 'N' : 'S') + '  ' + Math.abs(w.lng).toFixed(2) + '°' + (w.lng >= 0 ? 'E' : 'W');
  }
  var SHORT = { biznet: 'ביזנט', ipc: 'IPC', c2ch: 'C2CH', directory: 'סולו', reseller: 'ריסלר', elec_signed: 'הסכמים', elec_leads: 'לידים' };
  var short = function (products) { return products.map(function (p) { return SHORT[p] || p; }).join('+'); };
  function inDays(n) { return n === 1 ? 'מחר' : n === 2 ? 'בעוד יומיים' : 'בעוד ' + n + ' ימים'; }
  function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5); }
  var icon = function (id) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  var CREDIT = 'Photo: Wikimedia Commons (see images/CREDITS.md)';

  // ───────────── theme per view
  function peakView(i) { return i === current && (peakToday || params.get('peak') === '1'); }
  function themeOf(i) {
    var w = weeks[i], pk = peakView(i);
    var p = pk ? w.peakDay.palette : w.palette;
    return {
      base: p.base, a: p.a, b: p.b, c: p.c, accent: w.accent, ink: '#F6F2EA',
      image: pk ? w.peakDay.image : w.image, pos: pk ? w.peakDay.imagePos : w.imagePos, peak: pk,
    };
  }
  var cinema = $('cinema');
  function setVars(t, dur) {
    var v = { '--w-base': t.base, '--w-a': t.a, '--w-b': t.b, '--w-c': t.c, '--w-accent': t.accent, '--w-ink': t.ink };
    document.documentElement.style.setProperty('--w-pass', t.accent);
    if (!dur || reduced || !window.gsap) { Object.keys(v).forEach(function (k) { cinema.style.setProperty(k, v[k]); }); return; }
    gsap.to(cinema, Object.assign({ duration: dur, ease: 'sine.inOut' }, v));
  }

  // ───────────── title column
  function titleHTML(i) {
    var w = weeks[i], pk = peakView(i), pd = w.peakDay;
    var line = function (html, cls) { return '<span class="split-mask ' + (cls || '') + '"><span>' + html + '</span></span>'; };
    var eyebrow = pk
      ? '<span style="color:#fff;background:#d92d20;padding:2px 8px;border-radius:4px;font-weight:900;letter-spacing:.08em">יום שיא · בשידור חי</span>'
      : 'המסלול מסביב לעולם · ' + (i === current ? 'היעד של השבוע' : i < current ? 'יעד שכבר נחתנו בו' : 'יעד בהמשך המסלול');
    var since = daysBetween(asOf, pd.date);
    var when = since === 0 ? 'היום' : since > 0 ? inDays(since) : 'היה ב־' + dm(pd.date);
    var teaser = pk ? '' :
      '<button class="teaser" type="button" data-week="' + i + '">' +
      '<img src="' + pd.image + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
      '<span><span class="teaser__kicker">יום שיא · ' + dayName(pd.date) + ' ' + dm(pd.date) + ' · ' + when + '</span>' +
      '<span class="teaser__title" style="display:block">' + esc(pd.tbd ? 'הנושא ייחשף בקרוב' : pd.theme) + '</span>' +
      '<span class="teaser__when">הפרס ייחשף בקרוב</span></span></button>';
    var endLabel = !started ? 'להמראה · ' + dm(data.config.period.start) : 'לנחיתה ב' + weeks[weeks.length - 1].city + ' · 31.12';
    return '' +
      line('<span class="title__eyebrow">' + eyebrow + '</span>') +
      '<div class="title__leg num" aria-label="שבוע ' + w.order + ' מתוך ' + weeks.length + '">' +
        line('<span class="now">' + pad(w.order) + '</span>') + line('<span class="of">/ ' + pad(weeks.length) + '</span>') + '</div>' +
      '<h1 class="title__country">' + line(esc(w.country)) + '</h1>' +
      '<p class="title__city">' + line(esc(w.city)) + line('<span class="latin">' + esc(w.latin) + '</span>') + '</p>' +
      line('<span class="title__meta num"><span><b>' + range(w.dates) + '</b> ראשון–חמישי</span><span class="latin">' + coord(w) + '</span></span>') +
      '<div class="countdown">' + line('<span class="countdown__label">' + endLabel + '</span>') +
        '<div class="countdown__cells num" id="cd"></div></div>' +
      line(teaser);
  }
  var REVEAL = {
    tailored: { y: 46, d: 0.8, e: 'power3.out', s: 0.06 },
    soft: { y: 14, d: 1.0, e: 'sine.out', s: 0.08 },
    warm: { y: 30, d: 0.9, e: 'power2.out', s: 0.07 },
    breeze: { y: 22, d: 1.0, e: 'power1.out', s: 0.09 },
    strobe: { y: 40, d: 0.45, e: 'power4.out', s: 0.04 },
    snap: { y: 64, d: 0.5, e: 'expo.out', s: 0.03 },
    flow: { y: 20, d: 1.1, e: 'sine.out', s: 0.1 },
    ornate: { y: 34, d: 0.9, e: 'back.out(1.4)', s: 0.06 },
    solemn: { y: 24, d: 1.2, e: 'power2.out', s: 0.12 },
  };
  function renderTitle(i, animate) {
    $('title').innerHTML = titleHTML(i);
    tickCountdown();
    var tb = $('title').querySelector('.teaser');
    if (tb) tb.addEventListener('click', function () { goTo(+tb.dataset.week); });
    if (!animate || reduced || !window.gsap) return Promise.resolve();
    var r = REVEAL[weeks[i].motion.reveal] || REVEAL.tailored;
    return new Promise(function (res) {
      gsap.fromTo($('title').querySelectorAll('.split-mask > span'), { yPercent: 0, y: r.y, opacity: 0 },
        { y: 0, opacity: 1, duration: r.d, ease: r.e, stagger: r.s, onComplete: res });
    });
  }
  function hideTitle() {
    if (reduced || !window.gsap) return Promise.resolve();
    return new Promise(function (res) {
      gsap.to($('title').querySelectorAll('.split-mask > span'), { y: -24, opacity: 0, duration: 0.28, ease: 'power2.in', stagger: 0.02, onComplete: res });
    });
  }

  // ───────────── countdown (to 31.12 23:59 Israel time; to 1.11 before start)
  var nowBase = params.get('asOf') ? new Date(asOf + 'T11:20:00+02:00').getTime() : Date.now();
  var loadedAt = Date.now();
  function tickCountdown() {
    var el = $('cd');
    if (!el) return;
    var target = started ? new Date('2026-12-31T23:59:59+02:00') : new Date(data.config.period.start + 'T08:00:00+02:00');
    var ms = Math.max(0, target - (nowBase + Date.now() - loadedAt));
    var d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    var cells = [[d, 'ימים'], [pad(h), 'שעות'], [pad(m), 'דקות'], [pad(s), 'שניות']];
    el.innerHTML = cells.map(function (c) { return '<span class="countdown__cell"><b>' + c[0] + '</b><small>' + c[1] + '</small></span>'; }).join('');
  }
  setInterval(tickCountdown, 1000);

  // ───────────── rail
  function renderRail() {
    var legs = started ? current : 0;
    $('rail').innerHTML = '<span class="rail__progress" style="width:calc((100% - 48px) * ' + legs + ' / ' + weeks.length + ')"></span>' +
      weeks.map(function (w, i) {
        var cls = 'stop' + (i < current ? ' is-done' : '') + (i === current && started ? ' is-current' : '') + (i === view ? ' is-viewing' : '');
        return '<button class="' + cls + '" type="button" data-i="' + i + '"' + (i === view ? ' aria-current="true"' : '') + '>' +
          '<span class="stop__dot"></span><span class="stop__n num">' + pad(w.order) + '</span>' +
          '<span class="stop__city">' + esc(w.city) + '</span><span class="stop__date num">' + range(w.dates) + '</span></button>';
      }).join('');
  }
  $('rail').addEventListener('click', function (e) {
    var b = e.target.closest('.stop');
    if (b) goTo(+b.dataset.i);
  });

  // ───────────── peak takeover (cinematic layer only)
  function todayLeaders() {
    var by = {};
    data.results.forEach(function (r) { if (r[1] === asOf) by[r[0]] = (by[r[0]] || 0) + r[3]; });
    var users = {};
    data.users.forEach(function (u) { users[u.uid] = u; });
    var bestPerSector = {};
    Object.keys(by).forEach(function (uid) {
      var u = users[uid];
      if (!bestPerSector[u.sector] || by[uid] > bestPerSector[u.sector].n) bestPerSector[u.sector] = { u: u, n: by[uid] };
    });
    return bestPerSector;
  }
  function renderBroadcast(i) {
    var w = weeks[i], pd = w.peakDay;
    var total = Object.keys(E.today).reduce(function (s, k) { return s + E.today[k]; }, 0);
    var best = todayLeaders();
    var items = ['<span>מכירות באגף היום עד עכשיו: <b class="num">' + total + '</b></span>'];
    Object.keys(best).forEach(function (k) {
      items.push('<span>מוביל/ה היום ב' + esc(data.config.sectors[k].label) + ': <b><bdi>' + esc(best[k].u.name) + '</bdi></b> · <span class="num">' + best[k].n + ' מכירות</span></span>');
    });
    var track = items.concat(items).join('');
    $('broadcast').innerHTML =
      '<div class="bug"><span class="bug__dot"></span>יום שיא · ' + esc(w.city) + '<span class="bug__clock num" id="bug-clock"></span></div>' +
      '<div class="lower-third">' +
        '<div></div>' +
        '<div class="lower-third__body"><div class="lower-third__kicker">יום שיא · ' + dayName(pd.date) + ' ' + dm(pd.date) + '</div>' +
        '<div class="lower-third__title">' + esc(pd.tbd ? 'יום שיא' : pd.theme) + '</div>' +
        '<div class="lower-third__sub">' + 'התנאים יפורסמו בתקנון. הפרס ייחשף בקרוב.</div></div>' +
      '</div>' +
      '<div class="ticker"><span class="ticker__label">בשידור</span><div class="ticker__track">' + track + '</div></div>';
  }
  setInterval(function () {
    var c = $('bug-clock');
    if (c) { var d = new Date(nowBase + Date.now() - loadedAt); c.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  }, 1000);

  // ───────────── event strip (same height every day: peak live, or the next peak)
  function renderStrip() {
    var w = weeks[current], pd = w.peakDay;
    var prize = '<span class="strip__prize">פרס יום השיא<span class="prize-slot">ייחשף בקרוב</span></span>';
    var sep = '<span class="strip__sep"></span>';
    document.body.classList.toggle('is-peak-day', peakToday);
    if (peakToday) {
      var total = Object.keys(E.today).reduce(function (s, k) { return s + E.today[k]; }, 0);
      $('strip').innerHTML = '<span class="strip__tag"><i></i>יום שיא · ' + esc(pd.tbd ? w.city : pd.theme) + '</span>' + sep +
        '<span class="strip__item">מכירות היום <b class="num">' + total + '</b></span>' + sep +
                '<span class="strip__item">הנתונים בטבלאות מתעדכנים בסוף היום</span>' + prize;
      return;
    }
    var next = null;
    for (var i = 0; i < weeks.length; i++) if (weeks[i].peakDay.date > asOf) { next = weeks[i]; break; }
    var inner = '<span class="strip__tag"><i></i>' + (next ? 'יום השיא הבא' : 'התחרות הסתיימה') + '</span>';
    if (next) {
      inner += sep + '<span class="strip__item"><b>' + esc(next.peakDay.tbd ? next.city : next.peakDay.theme) + '</b> · ' + dayName(next.peakDay.date) + ' ' + dm(next.peakDay.date) + '</span>' +
        sep + '<span class="strip__item"><b>' + inDays(daysBetween(asOf, next.peakDay.date)) + '</b></span>';
    }
    inner += sep + '<span class="strip__item">ימי עבודה <b class="num">' + E.daysElapsed + '/' + E.workingDays + '</b></span>';
    $('strip').innerHTML = inner + prize;
  }

  // ───────────── globe + stage orchestration
  var view = params.get('week') ? Math.max(0, Math.min(8, +params.get('week') - 1)) : current;
  var mode = 'photo';
  var token = 0;
  var photo = $('photo'), photoImg = $('photo-img');
  var globe = window.Globe ? Globe.create($('globe'), weeks, window.ROUTE_ORIGIN, {
    labels: $('labels'), reducedMotion: reduced,
    onSelect: function (i) { goTo(i); },
    onOrb: function () { showGlobe(); },
    onDegrade: function () { degrade(); },
  }) : null;
  function degrade() {
    cinema.classList.add('webgl-off');
    if (globe) { globe.destroy(); globe = null; }
    $('globe').style.display = 'none'; $('labels').innerHTML = '';
    photo.style.clipPath = 'none';
    mode = 'photo';
    renderToggle();
  }
  if (!globe) degrade();
  else globe.setReached(started ? current : -1);

  function setPhoto(t) {
    photoImg.src = t.image;
    photoImg.style.objectPosition = t.pos || '50% 50%';
    photoImg.onerror = function () { photoImg.style.visibility = 'hidden'; };
    photoImg.onload = function () { photoImg.style.visibility = ''; };
    $('credit').textContent = CREDIT;
  }
  function preload(src) { return new Promise(function (res) { var im = new Image(); im.onload = im.onerror = function () { res(); }; im.src = src; }); }
  function clip(r, x, y) { return 'circle(' + r + ' at ' + x.toFixed(1) + 'px ' + y.toFixed(1) + 'px)'; }
  function animateClip(from, to, dur) {
    if (reduced || !window.gsap) { photo.style.clipPath = to; return Promise.resolve(); }
    return new Promise(function (res) { gsap.fromTo(photo, { clipPath: from }, { clipPath: to, duration: dur, ease: 'power3.inOut', onComplete: res }); });
  }
  function revealPhoto(i) {
    if (!globe) { photo.style.clipPath = 'none'; return Promise.resolve(); }
    var p = globe.screenOf(i);
    $('labels').style.visibility = 'hidden';
    return Promise.all([animateClip(clip('0%', p.x, p.y), clip('150%', p.x, p.y), 1.0), globe.setOrb(1, 1.0)]);
  }
  function collapsePhoto() {
    if (!globe) return Promise.resolve();
    var o = globe.orbRect();
    var y = o.y;
    return Promise.all([animateClip(clip('150%', o.x, y), clip('0%', o.x, y), 0.7), globe.setOrb(0, 0.8)]).then(function () {
      $('labels').style.visibility = '';
    });
  }
  function renderToggle() {
    var b = $('toggle');
    if (!globe) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = mode === 'photo' ? icon('globe') + 'מפת המסלול' : 'תמונת היעד';
    b.setAttribute('aria-pressed', mode === 'globe');
  }
  $('toggle').addEventListener('click', function () { mode === 'photo' ? showGlobe() : showPhoto(); });

  function showGlobe() {
    if (mode === 'globe' || !globe) return;
    mode = 'globe'; renderToggle(); token++;
    collapsePhoto();
  }
  function showPhoto() {
    if (mode === 'photo') return;
    mode = 'photo'; renderToggle(); token++;
    revealPhoto(view);
  }

  function applyPeak(i) {
    var pk = peakView(i);
    cinema.classList.toggle('is-peak', pk);
    if (pk) renderBroadcast(i); else $('broadcast').innerHTML = '';
  }

  function goTo(i) {
    if (i === view && mode === 'photo') return;
    var my = ++token;
    var from = view;
    view = i;
    renderRail();
    var w = weeks[i], t = themeOf(i);
    if (!globe || reduced) {
      setVars(t, reduced ? 0 : 0.6);
      if (globe) globe.setPalette(t), globe.jump(i, current), globe.setOrb(1, 0);
      setPhoto(t);
      photo.style.clipPath = globe ? clip('150%', 0, 0) : 'none';
      $('labels').style.visibility = globe ? 'hidden' : '';
      mode = 'photo'; renderToggle();
      applyPeak(i); renderTitle(i, false);
      return;
    }
    var flight = from === i ? 0.01 : w.motion.flight;
    var ready = preload(t.image);
    var out = Promise.all([hideTitle(), mode === 'photo' ? collapsePhoto() : Promise.resolve()]);
    mode = 'globe';
    out.then(function () {
      if (my !== token) return;
      cinema.classList.remove('is-peak');
      setVars(t, flight);
      globe.setPalette(t, flight);
      return globe.flyTo(i, { duration: flight, lift: w.motion.lift, ease: w.motion.ease });
    }).then(function () {
      if (my !== token) return;
      return ready;
    }).then(function () {
      if (my !== token) return;
      setPhoto(t);
      applyPeak(i);
      mode = 'photo'; renderToggle();
      return Promise.all([renderTitle(i, true), revealPhoto(i)]);
    });
  }

  function start() {
    var t = themeOf(view);
    setVars(t, 0);
    renderRail(); renderToggle();
    if (!globe) {
      setPhoto(t); applyPeak(view); renderTitle(view, false); return;
    }
    globe.setPalette(t);
    if (params.get('mode') === 'globe') {
      globe.jump(view, current); setPhoto(t); applyPeak(view); renderTitle(view, false);
      photo.style.clipPath = clip('0%', 0, 0);
      mode = 'globe'; renderToggle(); return;
    }
    if (reduced || params.get('intro') === '0') {
      globe.jump(view, current); globe.setOrb(1, 0); setPhoto(t); applyPeak(view); renderTitle(view, false);
      photo.style.clipPath = clip('150%', 0, 0); $('labels').style.visibility = 'hidden';
      return;
    }
    // Intro: start over the previous stop, fly the last leg, land on this week. Content is readable throughout.
    globe.jump(Math.max(0, view - 1), current);
    photo.style.clipPath = clip('0%', 0, 0);
    mode = 'globe'; renderTitle(view, true);
    var w = weeks[view], my = ++token;
    var ready = preload(t.image);
    setTimeout(function () {
      if (my !== token) return;
      globe.flyTo(view, { duration: view === 0 ? 1.6 : w.motion.flight, lift: w.motion.lift, ease: w.motion.ease })
        .then(function () { return ready; })
        .then(function () {
          if (my !== token) return;
          setPhoto(t); applyPeak(view); mode = 'photo'; renderToggle();
          revealPhoto(view);
        });
    }, 350);
  }

  // ───────────── Bezeq shell: header date
  $('asof').innerHTML = started
    ? 'נתונים עד סוף יום ' + dayName(Engine.addDays(asOf, -1)) + ' <b class="num">' + dm(Engine.addDays(asOf, -1)) + '</b>'
    : 'התחרות מתחילה ב־<b class="num">' + dm(data.config.period.start) + '</b>';

  // ───────────── boarding pass
  var byUid = {};
  E.reps.forEach(function (r) { byUid[r.uid] = r; });
  var selected = null;
  try { selected = localStorage.getItem('yearEnd.rep'); } catch (e) { /* storage blocked: no memory */ }
  if (params.get('rep')) {
    var hit = E.reps.filter(function (r) { return r.name === params.get('rep'); })[0];
    if (hit) selected = hit.uid;
  }
  if (selected && !byUid[selected]) selected = null;

  function barcode(seed) {
    var x = 0, h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    var bars = '';
    while (x < 190) {
      h = (h * 1664525 + 1013904223) >>> 0;
      var wdt = 1 + (h % 4);
      bars += '<rect x="' + x + '" width="' + wdt + '" height="34" />';
      x += wdt + 1 + ((h >> 8) % 3);
    }
    return '<svg class="pass__barcode" viewBox="0 0 196 34" preserveAspectRatio="none" aria-hidden="true" fill="#20294d">' + bars + '</svg>';
  }
  function moveHTML(m, big) {
    if (m == null) return '<span class="move move--same">' + icon('dash') + '</span>';
    if (m > 0) return '<span class="move move--up">' + icon('up') + '<span class="num">' + m + '</span></span>';
    if (m < 0) return '<span class="move move--down">' + icon('down') + '<span class="num">' + -m + '</span></span>';
    return '<span class="move move--same">' + (big ? '0' : icon('dash')) + '</span>';
  }
  function renderPass() {
    var r = selected && byUid[selected];
    if (!r) {
      $('pass-note').textContent = '';
      $('pass').innerHTML = '<div class="card pass pass--empty"><div class="pass__main"><div class="pass__head"><b>כרטיס עלייה</b><span class="latin">BOARDING PASS</span></div>' +
        '<div class="pass__body"><div class="pass-empty"><h3>מי טס איתנו?</h3><p>חפשו את השם שלכם בשורת החיפוש למעלה, וכאן יופיעו האחוז שלכם, המקום בטבלה, הפער לסף והחותמות שאספתם בדרך.</p>' +
        '<button class="btn" type="button" id="pass-find">' + icon('search') + 'לחיפוש השם</button></div></div></div>' +
        '<aside class="pass__stub"><h3>חותמות יעד</h3><p>חותמת לכל שבוע שבו עמדתם ביעד השבועי</p><div class="seals">' +
        weeks.map(function (w) { return '<span class="seal">' + w.code + '</span>'; }).join('') + '</div></aside></div>';
      $('pass-find').addEventListener('click', function () { $('search').focus(); });
      return;
    }
    var score = r.projected != null ? r.projected : r.attainment;
    var points = r.parts.reduce(function (s, p) { return s + p.points; }, 0);
    var target = r.parts.reduce(function (s, p) { return s + p.target; }, 0);
    var bonus = r.parts.reduce(function (s, p) { return s + (p.points - p.actual); }, 0);
    var gaps = r.threshold.filter(function (t) { return !t.met; });
    var w = weeks[current];
    $('pass-note').textContent = r.projected == null ? 'התחזית תחושב אחרי יום העבודה הראשון' : 'תחזית = הקצב שלך עד היום, מוקרן לסוף התחרות';
    var scale = 1.5, fillW = Math.min(score || 0, scale) / scale * 100;
    $('pass').innerHTML = '<article class="card pass" aria-label="כרטיס העלייה של ' + esc(r.name) + '">' +
      '<div class="pass__main">' +
        '<div class="pass__head"><b>כרטיס עלייה · שבוע ' + w.order + ' · ' + esc(w.city) + '</b><span class="latin">BOARDING PASS · ' + w.code + '</span></div>' +
        '<div class="pass__body">' +
          '<div class="pass__who"><small>נוסע/ת</small><div class="pass__name">' + esc(r.name) + '</div>' +
            '<div class="pass__team">' + esc(r.team) + ' · ' + esc(r.sectorLabel) + '</div></div>' +
          '<div class="pass__big"><small>תחזית עמידה ביעד</small><span class="pass__pct num">' + pct(score) + '<sup>%</sup></span></div>' +
          '<div class="bar" role="img" aria-label="' + pct(score) + ' אחוז מהיעד"><span class="bar__fill" style="width:' + fillW.toFixed(1) + '%"></span>' +
            '<span class="bar__mark" style="right:' + (100 / scale).toFixed(1) + '%"><span>יעד 100%</span></span></div>' +
        '</div>' +
        '<div class="pass__fields">' +
          '<div class="field"><small>מקום בענף</small><b class="num">' + r.rank + '</b><span class="num">מתוך ' + r.sectorSize + '</span></div>' +
          '<div class="field"><small>שינוי השבוע</small><b>' + moveHTML(r.move, true) + '</b><span>' + (r.move == null ? 'יוצג מהשבוע השני' : r.move === 0 ? 'אותו מקום' : 'מקומות') + '</span></div>' +
          '<div class="field"><small>פער לסף הכניסה</small>' + (gaps.length
            ? '<b class="num">עוד ' + gaps[0].gap + '</b><span class="num">' + gaps.map(function (g, k) { return (k ? 'עוד ' + g.gap + ' ' : '') + short(g.products); }).join(' · ') + '</span>'
            : '<b class="gap-ok">' + icon('check') + ' עבר</b><span>עומד/ת בכל תנאי הסף</span>') + '</div>' +
          '<div class="field"><small>נקודות / יעד</small><b class="num">' + Math.round(points) + '<span style="font-size:15px;color:var(--fg-2);font-weight:400"> / ' + target + '</span></b>' +
            '<span class="num">' + (bonus > 0 ? 'כולל ' + Math.round(bonus) + ' מימי שיא' : r.parts.map(function (p) { return '<bdi>' + short(p.products) + '</bdi>'; }).join(' · ')) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<aside class="pass__stub"><h3>חותמות יעד</h3><p class="num">' + r.sealCount + ' מתוך ' + weeks.length + ' · חותמת = עמידה ביעד השבועי</p><div class="seals">' +
        r.seals.map(function (s, k) {
          var wk = weeks[k];
          var cls = 'seal seal--' + s.state;
          var title = wk.city + ': ' + (s.state === 'earned' ? 'נאספה' : s.state === 'live' ? 'השבוע, ' + pct(s.attainment) + '% מהיעד השבועי' : s.state === 'missed' ? 'לא נאספה' : 'בהמשך');
          return '<span class="' + cls + '" style="--seal:' + wk.seal + '" title="' + esc(title) + '" aria-label="' + esc(title) + '">' + wk.code +
            (s.state === 'live' ? '<small class="num">' + pct(s.attainment) + '%</small>' : '') + '</span>';
        }).join('') + '</div>' + barcode(r.uid + r.name) + '</aside>' +
    '</article>';
  }

  // ───────────── KPIs
  function renderKpis() {
    // On pace for the entry threshold: each threshold's count so far, projected to the end of the period.
    var onPace = E.reps.filter(function (r) {
      return r.threshold.every(function (t) { return t.met || (E.daysElapsed > 0 && t.actual / E.daysElapsed * E.workingDays >= t.min); });
    }).length;
    var left = E.workingDays - E.daysElapsed;
    $('kpi-note').textContent = started ? 'נכון לסוף יום ' + dm(Engine.addDays(asOf, -1)) : '';
    var depts = E.departments.map(function (d) {
      var sc = d.score === Infinity ? null : d.score;
      var wdt = Math.min(sc || 0, 1.5) / 1.5 * 100;
      return '<div class="prod"><span>' + esc(d.label) + '</span><span class="track"><i style="width:' + wdt.toFixed(1) + '%"></i><em style="right:66.7%"></em></span><b class="num">' + pct(sc) + '%</b></div>';
    }).join('');
    $('kpis').innerHTML =
      '<div class="card kpi"><small>ימי עבודה שעברו</small><b class="num">' + E.daysElapsed + '<span style="font-size:18px;color:var(--fg-2);font-weight:400"> / ' + E.workingDays + '</span></b><span class="num">נותרו ' + left + ' ימי עבודה</span></div>' +
      '<div class="card kpi"><small>בקצב לעבור את סף הכניסה</small><b class="num">' + onPace + '<span style="font-size:18px;color:var(--fg-2);font-weight:400"> / ' + E.reps.length + '</span></b><span>נציגים, בכל הענפים</span></div>' +
      '<div class="card kpi kpi--wide"><small style="margin-bottom:6px">מחלקות: תחזית עמידה במוצר החלש (קו = 100%)</small>' + depts + '</div>';
  }

  // ───────────── leaderboards
  var TABS = [
    { id: 'soho', label: 'מכירות סוהו' }, { id: 'advertising', label: 'פרסום דיגיטלי' }, { id: 'electricity', label: 'חשמל' },
    { id: 'soho_service', label: 'שירות סוהו' }, { id: 'advertising_service', label: 'שירות פרסום' }, { id: 'electricity_service', label: 'שירות חשמל' },
    { id: 'tl', label: 'ראשי צוותים' }, { id: 'dept', label: 'מחלקות' },
  ];
  var tab = selected && byUid[selected] ? byUid[selected].sector : 'soho';
  var expanded = false;
  function countOf(id) {
    if (id === 'tl') return E.teams.length;
    if (id === 'dept') return E.departments.length;
    return (E.bySector[id] || []).length;
  }
  function renderTabs() {
    $('tabs').innerHTML = TABS.map(function (t) {
      return '<button class="tab" role="tab" type="button" data-tab="' + t.id + '" aria-selected="' + (t.id === tab) + '">' + t.label + '<span class="num">' + countOf(t.id) + '</span></button>';
    }).join('');
  }
  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.tab');
    if (!b) return;
    tab = b.dataset.tab; expanded = false;
    renderTabs(); renderBoard();
  });
  function bar(x) {
    var wdt = Math.min(x || 0, 1.5) / 1.5 * 100;
    return '<div class="mini"><i style="width:' + wdt.toFixed(1) + '%"></i><em style="right:66.7%"></em></div>';
  }
  function repRow(r) {
    var gaps = r.threshold.filter(function (t) { return !t.met; });
    var sc = r.projected != null ? r.projected : r.attainment;
    return '<tr class="' + (r.uid === selected ? 'is-me' : '') + (r.rank <= 3 ? ' top3' : '') + '">' +
      '<td class="c-rank num">' + r.rank + '</td><td class="c-move">' + moveHTML(r.move) + '</td>' +
      '<td class="c-name" title="' + esc(r.name) + '">' + esc(r.name) + '</td><td class="c-team">' + esc(r.team) + '</td>' +
      '<td class="c-bar">' + bar(sc) + '</td><td class="c-pct num">' + pct(sc) + '%</td>' +
      '<td>' + (gaps.length ? '<span class="chip chip--gap num">חסרים ' + gaps.map(function (g) { return '<bdi>' + g.gap + ' ' + short(g.products) + '</bdi>'; }).join(' · ') + '</span>'
        : '<span class="chip chip--ok">' + icon('check') + 'עבר סף</span>') + '</td>' +
      '<td class="c-seals"><span class="dots" aria-label="' + r.sealCount + ' חותמות">' + r.seals.map(function (s) {
        return '<i class="' + (s.state === 'earned' ? 'on' : s.state === 'live' ? 'live' : '') + '"></i>';
      }).join('') + '</span></td></tr>';
  }
  function renderBoard() {
    var html;
    if (tab === 'tl' || tab === 'dept') {
      var list = tab === 'tl' ? E.teams : E.departments;
      html = '<table class="board"><thead><tr><th>מקום</th><th>' + (tab === 'tl' ? 'צוות' : 'מחלקה') + '</th>' + (tab === 'tl' ? '<th>מחלקה</th>' : '') +
        '<th>יעדים (תחזית)</th><th>המוצר החלש</th><th style="text-align:end">%</th><th>מצב</th></tr></thead><tbody>' +
        list.map(function (t) {
          var sc = t.score === Infinity ? null : t.score;
          return '<tr class="' + (t.rank <= 3 ? 'top3' : '') + '"><td class="c-rank num">' + t.rank + '</td><td class="c-name">' + esc(t.name || t.label) + '</td>' +
            (tab === 'tl' ? '<td class="c-team">' + esc(t.departmentLabel) + '</td>' : '') +
            '<td class="c-team num">' + t.targets.map(function (x) { return '<bdi>' + short(x.key.split('+')) + ' ' + x.actual + '/' + x.target + '</bdi>'; }).join(' · ') + '</td>' +
            '<td class="c-bar">' + bar(sc) + '</td><td class="c-pct num">' + pct(sc) + '%</td>' +
            '<td>' + (t.met ? '<span class="chip chip--ok">' + icon('check') + 'בקצב ל־100%</span>' : '<span class="chip chip--gap">מתחת לקצב</span>') + '</td></tr>';
        }).join('') + '</tbody></table>';
      $('board').innerHTML = html;
      return;
    }
    var reps = E.bySector[tab] || [];
    var limit = expanded ? reps.length : 12;
    var shown = reps.slice(0, limit);
    var me = selected && byUid[selected];
    var meRow = me && me.sector === tab && me.rank > limit
      ? '<tr><td colspan="8" style="height:26px;text-align:center;color:var(--n-500)">⋯</td></tr>' + repRow(me) : '';
    html = '<table class="board"><thead><tr><th>מקום</th><th>שינוי</th><th>שם</th><th>צוות</th><th>תחזית עמידה ביעד</th><th style="text-align:end">%</th><th>סף כניסה</th><th>חותמות</th></tr></thead><tbody>' +
      shown.map(repRow).join('') + meRow + '</tbody></table>' +
      (reps.length > 12 ? '<div class="board-more"><button class="btn btn--ghost" type="button" id="more">' + (expanded ? 'הצגת 12 הראשונים' : 'הצגת כל ' + reps.length + ' הנציגים') + '</button></div>' : '');
    $('board').innerHTML = html;
    var more = $('more');
    if (more) more.addEventListener('click', function () { expanded = !expanded; renderBoard(); });
  }

  // ───────────── search (fixed in the top bar; never moves)
  var input = $('search'), listEl = $('search-list'), opts = [], active = -1;
  function closeList() { listEl.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
  function norm(s) { return String(s).replace(/[׳'״"\s]/g, '').toLowerCase(); }
  input.addEventListener('input', function () {
    var q = norm(input.value);
    if (!q) { closeList(); return; }
    opts = E.reps.filter(function (r) { return norm(r.name).indexOf(q) >= 0 || norm(r.team).indexOf(q) >= 0; }).slice(0, 8);
    active = opts.length ? 0 : -1;
    listEl.innerHTML = opts.length ? opts.map(function (r, k) {
      return '<li class="search__opt" role="option" id="opt-' + k + '" data-k="' + k + '" aria-selected="' + (k === active) + '"><b>' + esc(r.name) + '</b>' +
        '<span class="num">' + pct(r.projected != null ? r.projected : r.attainment) + '%</span><small>' + esc(r.team) + ' · ' + esc(r.sectorLabel) + '</small></li>';
    }).join('') : '<li class="search__empty">לא נמצא שם כזה. נסו חלק מהשם.</li>';
    listEl.hidden = false; input.setAttribute('aria-expanded', 'true');
  });
  input.addEventListener('keydown', function (e) {
    if (listEl.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
      [].forEach.call(listEl.children, function (li, k) { li.setAttribute('aria-selected', k === active); });
      input.setAttribute('aria-activedescendant', 'opt-' + active);
    } else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(opts[active]); }
    else if (e.key === 'Escape') closeList();
  });
  listEl.addEventListener('mousedown', function (e) {
    var li = e.target.closest('.search__opt');
    if (li) { e.preventDefault(); choose(opts[+li.dataset.k]); }
  });
  input.addEventListener('blur', function () { setTimeout(closeList, 120); });
  function choose(r) {
    selected = r.uid;
    try { localStorage.setItem('yearEnd.rep', r.uid); } catch (e) { /* ignore */ }
    input.value = r.name; closeList();
    tab = r.sector; expanded = false;
    renderPass(); renderTabs(); renderBoard();
    var target = document.querySelector('.cockpit');
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: reduced ? 'auto' : 'smooth' });
  }
  if (selected && byUid[selected]) input.value = byUid[selected].name;

  // ───────────── footer
  $('foot').innerHTML = (data.config.example ? '<span class="demo-flag">נתוני הדגמה · שמות בדויים</span>' : '') +
    '<span>הדירוג לפי תחזית עמידה ביעד: הקצב עד היום, מוקרן לסוף התחרות. ימי שיא נספרים בניקוד בלבד.</span>' +
    '<span>פרסים: ייחשפו בקרוב.</span><a href="images/CREDITS.md" style="color:inherit">קרדיטים לתמונות</a>';

  renderStrip(); renderPass(); renderKpis(); renderTabs(); renderBoard();
  start();
})();
