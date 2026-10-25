// Scoring for the static site. Classic script (no modules): exposes window.Engine.
// Formulas follow contests/platform/src/engine.js (reference workbook, see tracker/scoring-logic.md):
//   projected attainment = points / ((target / workingDays) * daysElapsed), peak-day bonus on score only.
// Additions for this site: rank movement since last week, and weekly destination seals.
// Standings count completed days only (through the day before asOf), matching daysElapsed. Rows dated
// asOf itself are today's live figures, shown only in the peak-day strip.
(function () {
  'use strict';
  var WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var round = function (n, p) { p = p == null ? 4 : p; var f = Math.pow(10, p); return Math.round(n * f) / f; };

  function addDays(date, n) {
    var d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function eachDate(start, end, fn) {
    for (var d = start; d <= end; d = addDays(d, 1)) fn(d);
  }
  function dayWeight(cal, date) {
    if (cal.overrides && date in cal.overrides) return cal.overrides[date];
    var wd = WEEKDAYS[new Date(date + 'T00:00:00Z').getUTCDay()];
    return cal.weekdayWeights[wd] || 0;
  }
  function workingDays(cal, start, end) {
    var s = 0;
    eachDate(start, end, function (d) { s += dayWeight(cal, d); });
    return round(s);
  }
  // Completed working days before asOf (today is not complete yet), clamped to the period.
  function daysElapsed(config, asOf) {
    var p = config.period;
    if (asOf <= p.start) return 0;
    return workingDays(config.calendar, p.start, asOf > p.end ? p.end : addDays(asOf, -1));
  }
  function sumProducts(totals, products) {
    var list = Array.isArray(products) ? products : products.split('+');
    var s = 0;
    for (var i = 0; i < list.length; i++) s += (totals && totals[list[i]]) || 0;
    return s;
  }
  function projected(actual, target, elapsed, total) {
    if (!target || elapsed <= 0) return null;
    return round(actual / ((target / total) * Math.min(elapsed, total)));
  }
  function peakMultiplier(config, date, product, sector) {
    var m = 1;
    (config.peakDays || []).forEach(function (p) {
      if (p.dates.indexOf(date) < 0) return;
      if ((p.appliesTo || ['score']).indexOf('score') < 0) return;
      if (p.products && p.products.indexOf(product) < 0) return;
      if (p.sectors && p.sectors.indexOf(sector) < 0) return;
      m = Math.max(m, p.multiplier || 1);
    });
    return m;
  }

  // Index rows once: per uid, per date, per product.
  function indexRows(data) {
    var byUser = {};
    data.results.forEach(function (r) {
      var u = byUser[r[0]] || (byUser[r[0]] = []);
      u.push(r);
    });
    return byUser;
  }

  // Totals for one rep in [start, end]: real counts and peak-day bonus points.
  function totalsFor(config, rows, sector, start, end) {
    var t = {}, bonus = {};
    if (!rows) return { t: t, bonus: bonus };
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r[1] < start || r[1] > end) continue;
      t[r[2]] = (t[r[2]] || 0) + r[3];
      var m = peakMultiplier(config, r[1], r[2], sector);
      if (m > 1) bonus[r[2]] = (bonus[r[2]] || 0) + r[3] * (m - 1);
    }
    return { t: t, bonus: bonus };
  }

  function evaluateRep(config, user, tot, elapsed, total) {
    var sector = config.sectors[user.sector];
    var parts = sector.score.map(function (p) {
      var actual = sumProducts(tot.t, p.products);
      var points = actual + round(sumProducts(tot.bonus, p.products), 2);
      return {
        products: p.products, label: labelOf(config, p.products),
        actual: actual, points: points, target: p.target, weight: p.weight,
        attainment: round(points / p.target), projected: projected(points, p.target, elapsed, total),
      };
    });
    var weighted = function (key) {
      if (parts.some(function (p) { return p[key] === null; })) return null;
      return round(parts.reduce(function (s, p) { return s + p.weight * p[key]; }, 0));
    };
    var threshold = sector.threshold.map(function (t) {
      var actual = sumProducts(tot.t, t.products);
      return { products: t.products, label: labelOf(config, t.products), actual: actual, min: t.min, met: actual >= t.min, gap: Math.max(0, t.min - actual) };
    });
    return {
      uid: user.uid, name: user.name, sector: user.sector, sectorLabel: sector.label, track: sector.track,
      team: user.team, parts: parts,
      attainment: weighted('attainment'), projected: weighted('projected'),
      threshold: threshold, qualified: threshold.every(function (t) { return t.met; }),
    };
  }
  function labelOf(config, products) {
    return products.map(function (x) { return (config.products[x] || {}).label || x; }).join(' + ');
  }
  var scoreOf = function (r) { return r.projected != null ? r.projected : (r.attainment || 0); };

  function rank(reps) {
    var by = {};
    reps.forEach(function (r) { (by[r.sector] || (by[r.sector] = [])).push(r); });
    Object.keys(by).forEach(function (k) {
      var list = by[k].sort(function (a, b) { return scoreOf(b) - scoreOf(a) || (a.uid < b.uid ? -1 : 1); });
      list.forEach(function (r, i) { r.rank = i + 1; r.sectorSize = list.length; });
    });
    return by;
  }

  function standings(config, users, byUser, asOf) {
    var p = config.period;
    var total = workingDays(config.calendar, p.start, p.end);
    var elapsed = daysElapsed(config, asOf);
    var end = asOf <= p.end ? addDays(asOf, -1) : p.end;
    var reps = users.filter(function (u) { return config.sectors[u.sector]; }).map(function (u) {
      return evaluateRep(config, u, totalsFor(config, byUser[u.uid], u.sector, p.start, end), elapsed, total);
    });
    return { reps: reps, bySector: rank(reps), total: total, elapsed: elapsed };
  }

  // Weekly seal: the rep's points inside the week reached the week's share of the period target.
  function seals(config, user, rows, weeks, asOf) {
    var total = workingDays(config.calendar, config.period.start, config.period.end);
    var sector = config.sectors[user.sector];
    return weeks.map(function (w) {
      if (asOf < w.dates[0]) return { order: w.order, state: 'future' };
      var end = asOf <= w.dates[1] ? addDays(asOf, -1) : w.dates[1];
      var tot = totalsFor(config, rows, user.sector, w.dates[0], end);
      var share = workingDays(config.calendar, w.dates[0], w.dates[1]) / total;
      var att = sector.score.reduce(function (s, p) {
        var pts = sumProducts(tot.t, p.products) + sumProducts(tot.bonus, p.products);
        return s + p.weight * (pts / (p.target * share));
      }, 0);
      var live = asOf <= w.dates[1];
      return { order: w.order, state: att >= 1 ? 'earned' : live ? 'live' : 'missed', attainment: round(att) };
    });
  }

  function evaluateTargets(config, totals, targets, elapsed, total) {
    return Object.keys(targets).map(function (key) {
      var actual = sumProducts(totals, key), target = targets[key];
      return { key: key, label: labelOf(config, key.split('+')), actual: actual, target: target,
        attainment: round(actual / target), projected: projected(actual, target, elapsed, total) };
    });
  }

  function evaluate(data, weeks, asOf) {
    var config = data.config;
    var byUser = data._byUser || (data._byUser = indexRows(data));
    var now = standings(config, data.users, byUser, asOf);

    // Rank movement: compare with the standings at the end of last week (the start of the current week).
    var weekNow = weekOf(weeks, asOf);
    var prevAsOf = weekNow && weekNow.order > 1 ? weekNow.dates[0] : null;
    var prev = prevAsOf ? standings(config, data.users, byUser, prevAsOf) : null;
    var prevRank = {};
    if (prev) prev.reps.forEach(function (r) { prevRank[r.uid] = r.rank; });
    var usersById = {};
    data.users.forEach(function (u) { usersById[u.uid] = u; });
    now.reps.forEach(function (r) {
      r.move = prev ? prevRank[r.uid] - r.rank : null;
      r.seals = seals(config, usersById[r.uid], byUser[r.uid], weeks, asOf);
      r.sealCount = r.seals.filter(function (s) { return s.state === 'earned'; }).length;
    });

    // Teams and departments (actual vs target, projected).
    var end = asOf <= config.period.end ? addDays(asOf, -1) : config.period.end;
    var teamTotals = {};
    data.users.forEach(function (u) {
      var tt = teamTotals[u.team] || (teamTotals[u.team] = {});
      var t = totalsFor(config, byUser[u.uid], u.sector, config.period.start, end).t;
      Object.keys(t).forEach(function (k) { tt[k] = (tt[k] || 0) + t[k]; });
    });
    var teams = Object.keys(config.teams).map(function (name) {
      var t = config.teams[name];
      var targets = evaluateTargets(config, teamTotals[name], t.targets, now.elapsed, now.total);
      return { name: name, kind: t.kind, department: t.department, departmentLabel: config.departments[t.department].label,
        size: data.users.filter(function (u) { return u.team === name; }).length,
        targets: targets, score: minScore(targets), met: targets.every(function (x) { return (x.projected || 0) >= 1; }) };
    });
    var departments = Object.keys(config.departments).map(function (id) {
      var d = config.departments[id], totals = {};
      Object.keys(config.teams).forEach(function (name) {
        if (config.teams[name].department !== id) return;
        var tt = teamTotals[name] || {};
        Object.keys(tt).forEach(function (k) { totals[k] = (totals[k] || 0) + tt[k]; });
      });
      var targets = evaluateTargets(config, totals, d.targets, now.elapsed, now.total);
      return { id: id, label: d.label, targets: targets, score: minScore(targets), met: targets.every(function (x) { return (x.projected || 0) >= 1; }) };
    });
    [teams, departments].forEach(function (l) {
      l.sort(function (a, b) { return b.score - a.score; }).forEach(function (x, i) { x.rank = i + 1; });
    });

    // Division totals per product, today's sales (for the peak-day strip).
    var division = {}, today = {};
    data.results.forEach(function (r) {
      if (r[1] >= config.period.start && r[1] <= end) division[r[2]] = (division[r[2]] || 0) + r[3];
      if (r[1] === asOf) today[r[2]] = (today[r[2]] || 0) + r[3];
    });

    return {
      asOf: asOf, week: weekNow, workingDays: now.total, daysElapsed: now.elapsed,
      reps: now.reps, bySector: now.bySector, teams: teams, departments: departments,
      division: division, today: today,
    };
  }
  // A team / department is as strong as its weakest product (all products must reach 100%).
  function minScore(targets) {
    return targets.reduce(function (m, t) { return Math.min(m, t.projected != null ? t.projected : t.attainment); }, Infinity);
  }

  function weekOf(weeks, date) {
    for (var i = 0; i < weeks.length; i++) {
      var w = weeks[i];
      // Fri/Sat after a week still belong to it, until the next Sunday.
      if (date >= w.dates[0] && date < addDays(w.dates[1], 3)) return w;
    }
    if (date < weeks[0].dates[0]) return null;
    return weeks[weeks.length - 1];
  }

  window.Engine = { evaluate: evaluate, weekOf: weekOf, addDays: addDays, workingDays: workingDays, scoreOf: scoreOf };
})();
