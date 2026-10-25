// Writes data/data.js with DEMO data for the year-end contest site.
//   node tools/make-demo-data.js [asOf=2026-11-18]
// Fake reps only ("נציג א׳"), demo uids that are never shown. Targets are October's rules scaled to
// 45 working days and are NOT official: replace this file's output with the real export.
const fs = require('fs');
const path = require('path');

const asOf = process.argv[2] || '2026-11-18';

// Deterministic PRNG so screenshots are reproducible.
let seed = 20261101;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const poisson = (l) => { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= rnd(); } while (p > L); return k - 1; };

const config = {
  id: '2026-11-year-end',
  name: '60 יום מסביב לעולם',
  division: 'אגף סוהו חשמל ושירותי דיגיטל',
  example: true,
  _comment: 'DEMO targets: October 2026 rules scaled to 45 working days. Not official.',
  period: { start: '2026-11-01', end: '2026-12-31' },
  calendar: { weekdayWeights: { sun: 1, mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0 }, overrides: {} },
  products: {
    biznet: { label: 'ביזנט' }, ipc: { label: 'IPC / סנטריקס' }, c2ch: { label: 'C2CH' },
    directory: { label: 'מדריך עסקי סולו' }, reseller: { label: 'ריסלר' },
    elec_signed: { label: 'הסכמי חשמל' }, elec_leads: { label: 'לידים לחשמל' },
  },
  sectors: {
    soho: { label: 'מכירות סוהו', track: 'sales',
      score: [{ products: ['biznet', 'ipc'], target: 90, weight: 1 }],
      threshold: [{ products: ['biznet', 'ipc'], min: 90 }, { products: ['c2ch'], min: 9 }] },
    advertising: { label: 'פרסום דיגיטלי', track: 'sales',
      score: [{ products: ['directory'], target: 39, weight: 0.7 }, { products: ['reseller'], target: 9, weight: 0.3 }],
      threshold: [{ products: ['directory'], min: 39 }, { products: ['reseller'], min: 9 }] },
    electricity: { label: 'חשמל', track: 'sales',
      score: [{ products: ['elec_signed'], target: 250, weight: 1 }],
      threshold: [{ products: ['elec_signed'], min: 250 }] },
    soho_service: { label: 'שירות סוהו', track: 'service',
      score: [{ products: ['biznet'], target: 15, weight: 1 }],
      threshold: [{ products: ['biznet'], min: 15 }, { products: ['c2ch'], min: 4 }] },
    advertising_service: { label: 'שירות פרסום', track: 'service',
      score: [{ products: ['directory', 'reseller'], target: 7, weight: 1 }],
      threshold: [{ products: ['directory', 'reseller'], min: 7 }] },
    electricity_service: { label: 'שירות חשמל', track: 'service',
      score: [{ products: ['elec_leads'], target: 87, weight: 1 }],
      threshold: [{ products: ['elec_leads'], min: 87 }] },
  },
  departments: {
    soho_center: { label: 'מוקד סוהו', targets: {} },
    soho_field: { label: 'סוכני שטח סוהו', targets: {} },
    advertising_centers: { label: 'מוקדי פרסום דיגיטלי', targets: {} },
    electricity_center: { label: 'מוקד חשמל', targets: {} },
  },
  teams: {},
  // Peak days (ימי שיא): one per week, dates mirror weeks.js. Multiplier is a demo value.
  peakDays: ['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09',
    '2026-12-16', '2026-12-23', '2026-12-31'].map((d, i) => ({
    id: `peak-${i + 1}`, label: 'יום שיא', dates: [d], multiplier: 2,
    products: ['biznet', 'ipc', 'directory', 'reseller', 'elec_signed', 'elec_leads'], appliesTo: ['score'],
  })),
};

const teamPlan = [
  ['צוות מכירות סוהו 1', 'sales', 'soho_center', 'soho', 14],
  ['צוות מכירות סוהו 2', 'sales', 'soho_center', 'soho', 12],
  ['צוות שטח סוהו צפון', 'sales', 'soho_field', 'soho', 8],
  ['צוות שטח סוהו דרום', 'sales', 'soho_field', 'soho', 8],
  ['צוות מדריך עסקי 1', 'sales', 'advertising_centers', 'advertising', 12],
  ['צוות מדריך עסקי 2', 'sales', 'advertising_centers', 'advertising', 10],
  ['צוות חשמל 1', 'sales', 'electricity_center', 'electricity', 15],
  ['צוות חשמל 2', 'sales', 'electricity_center', 'electricity', 14],
  ['צוות שירות סוהו 1', 'service', 'soho_center', 'soho_service', 16],
  ['צוות שירות סוהו 2', 'service', 'soho_center', 'soho_service', 14],
  ['צוות שימור פרסום', 'service', 'advertising_centers', 'advertising_service', 14],
  ['צוות שירות חשמל', 'service', 'electricity_center', 'electricity_service', 16],
];

const letters = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');
let n = 0;
const users = [];
for (const [team, kind, dept, sector, size] of teamPlan) {
  const targets = {};
  for (const part of config.sectors[sector].score) {
    const key = part.products.join('+');
    targets[key] = Math.round(part.target * size * 0.92);
  }
  config.teams[team] = { kind, department: dept, targets };
  for (const [k, v] of Object.entries(targets)) {
    const d = config.departments[dept].targets;
    d[k] = (d[k] || 0) + v;
  }
  for (let i = 0; i < size; i++, n++) {
    const L = letters[n % letters.length];
    const round = Math.floor(n / letters.length);
    users.push({ uid: `demo-${String(n + 1).padStart(3, '0')}`, name: `נציג ${L}׳${round ? ' ' + (round + 1) : ''}`, sector, team });
  }
}

// Daily results across the whole period. The site counts only rows up to asOf.
const days = [];
for (let d = new Date('2026-11-01T00:00:00Z'); d <= new Date('2026-12-31T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
  if (d.getUTCDay() <= 4) days.push(d.toISOString().slice(0, 10));
}
const peakDates = new Set(config.peakDays.flatMap((p) => p.dates));
const rows = [];
for (const u of users) {
  const s = config.sectors[u.sector];
  const skill = 0.4 + rnd() * 0.62;
  const trend = (rnd() - 0.5) * 0.5; // some reps accelerate, some fade
  const daily = {};
  for (const part of s.score) {
    const share = part.products.length > 1 ? 1 / part.products.length : 1;
    for (const p of part.products) daily[p] = (daily[p] || 0) + (part.target * share) / days.length;
  }
  if (u.sector === 'soho') daily.c2ch = 10 / days.length;
  if (u.sector === 'soho_service') daily.c2ch = 4.4 / days.length;
  days.forEach((date, i) => {
    const mood = 0.6 + rnd() * 0.8;
    const t = i / days.length;
    const boost = peakDates.has(date) ? 1.4 : 1;
    for (const [p, base] of Object.entries(daily)) {
      const c = poisson(base * skill * mood * boost * (1 + trend * (t - 0.5) * 2));
      if (c) rows.push([u.uid, date, p, c]);
    }
  });
}

const out = {
  generated: 'demo',
  asOf,
  config,
  users,
  // [uid, date, product, count]
  results: rows,
};
fs.writeFileSync(path.join(__dirname, '..', 'data', 'data.js'),
  '// DEMO DATA ONLY. Generated by tools/make-demo-data.js. Fake names, no real IDs.\n' +
  '// Replace with the real export (same shape) when the contest starts.\n' +
  'window.CONTEST_DATA = ' + JSON.stringify(out) + ';\n');
console.log(`data.js: ${users.length} reps, ${rows.length} rows, asOf ${asOf}`);
