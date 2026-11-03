// The one config file of the sphere-globe teaser: the department → home city → colour mapping, the destination codes,
// the palette, the three cuts' timing and framing, and the Google Earth Studio opening. The destinations' order,
// Hebrew country names, coordinates and week accents come from ../../contest.json (journey.stops) at render time.
// Colours: Bezeq only (brand/bezeq-tokens.css: navy is the official logo ink) plus lightness steps of them.

export const PALETTE = {
  navy: '#16254F',      // --bz-navy: band, chips
  navyDeep: '#00204D',  // --bz-navy-deep: space ground
  blueDeep: '#00316B',  // --bz-blue-deep: night oceans
  sky: '#51C6F1',       // --bz-blue: atmosphere, band rules, city glow
  white: '#FFFFFF',
};

// Home points. Shown on screen ONLY as the Hebrew city name; the departments stay here for the record.
// Each arc has a colour AND a dash pattern (dash = share of each period that is drawn; period in arcs per unit length),
// so no arc relies on hue. באר שבע is left out until it is confirmed.
export const HOMES = [
  { id: 'holon', he: 'חולון', departments: ['האגף (אגף סוהו • חשמל • שירותי דיגיטל)'], ll: [34.7961, 32.0163],
    colour: '#FFFFFF', dash: { duty: 1, period: 0 }, chip: { dx: 70, dy: 34 } },
  { id: 'tel-aviv', he: 'תל אביב', departments: ['מוקד סוהו', 'פרסום דיגיטלי תל אביב'], ll: [34.7818, 32.0853],
    colour: '#51C6F1', dash: { duty: 0.7, period: 34 }, chip: { dx: -96, dy: -18 } },
  { id: 'haifa', he: 'חיפה', departments: ['מוקד 144 חיפה', 'סוכני שטח סוהו (צפון)'], ll: [34.9896, 32.7940],
    colour: '#A9E4F9', dash: { duty: 0.45, period: 70 }, chip: { dx: 74, dy: -26 } },
  { id: 'ashdod', he: 'אשדוד', departments: ['מוקד חשמל'], ll: [34.6435, 31.8014],
    colour: '#89ABD2', dash: { duty: 0.22, period: 130 }, chip: { dx: -86, dy: 30 } },
];

// Real IATA codes, by contest.json stop id (Jerusalem = JLM, its landmark the Chords Bridge).
export const IATA = { paris: 'CDG', venice: 'VCE', marrakech: 'RAK', 'las-vegas': 'LAS', cancun: 'CUN', tokyo: 'HND', athens: 'ATH', 'new-delhi': 'DEL', jerusalem: 'JLM' };

// The band: true facts only (no countdown, no invented numbers, no prize names or counts).
export const BAND = ['9 שבועות · 9 מדינות · 60 יום', 'ההמראה ב-1.11', 'ונחשוף את הפרסים בקרוב'];

export const TITLE = { name: '60 יום מסביב לעולם', dates: '1.11–31.12.2026', mark: 'בזק' };

// Camera and timing per cut. Seconds. zoom = globe radius on screen as a share of half the shorter side.
// open: the 0–open seconds close on Israel (altitude km, centre lon/lat), where the Google Earth Studio shot drops in.
const MASTER = {
  id: 'master', w: 1920, h: 1080, fps: 30, duration: 32, fovMin: 35,
  open: { end: 4, altKm: [2300, 1900], centre: [34.85, 32.3], chipsAt: 0.6, chipStep: 0.35 },
  out: { start: 3.6, end: 7.8 },
  legs: { start: 6.8, first: 1.7, each: 1.72 },   // leg 1: the four homes to Paris; legs 2–9 through the route
  home: { start: 22.3, end: 26.4, zoom: 0.8 },  // back over Israel
  route: { zoomNear: 0.86, zoomFar: 0.66 },
  band: { in: [5.4, 7.0], speed: 0.055, tilt: 0.3, roll: -0.08 },
  title: { in: 25.4, hold: 32 },
  chipOut: [0.2, 0.8],                             // the previous stop's chip fades over these seconds after the next arrival
  shift: { x: -0.2, y: 0 },                        // the globe's offset at the end (share of width), title on the right
};
const VERTICAL = {
  ...MASTER, id: 'vertical', w: 1080, h: 1920, duration: 20,
  open: { ...MASTER.open, end: 2.6, chipsAt: 0.3, chipStep: 0.25 },
  out: { start: 2.2, end: 4.8 },
  legs: { start: 4.0, first: 1.2, each: 1.12 },
  home: { start: 14.2, end: 16.8, zoom: 0.62 },
  route: { zoomNear: 0.8, zoomFar: 0.62 },
  band: { ...MASTER.band, in: [3.2, 4.4] },
  title: { in: 15.8, hold: 20 },
  shift: { x: 0, y: -0.2 },                        // the globe up, the title below it (top 250 / bottom 300 px clear)
  safe: { top: 250, bottom: 300 },
};
const WHATSAPP = {
  ...VERTICAL, id: 'whatsapp', duration: 15,
  open: { ...VERTICAL.open, end: 1.8, chipsAt: 0.15, chipStep: 0.18 },
  out: { start: 1.5, end: 3.4 },
  legs: { start: 2.8, first: 0.95, each: 0.88 },
  home: { start: 10.8, end: 12.8, zoom: 0.62 },
  band: { ...VERTICAL.band, in: [2.2, 3.2] },
  title: { in: 11.9, hold: 15 },
  chipOut: [-0.3, 0],                              // short legs: the previous chip is gone before the next one appears
};
export const CUTS = { master: MASTER, vertical: VERTICAL, whatsapp: WHATSAPP };

// The Google Earth Studio opening (zoom-out from the Bezeq building in Holon). Put the exported JPEG sequence in
// opening/16x9/ and opening/9x16/ (any names that sort in frame order). The render uses the LAST `seconds` of it as the
// first shot and cross-fades into the globe over `fade` seconds; the globe's own opening framing (CUTS.*.open.altKm[1],
// fovMin) is the hand-off: set them to the Studio camera's final altitude and field of view so the cut is seamless.
// attribution: shown on screen for as long as the Studio footage is (required by the Earth Studio terms). PLACEHOLDER:
// paste the exact attribution text Studio lists for the export ("Google Earth" + its data providers).
export const OPENING = { dirs: { master: 'opening/16x9', vertical: 'opening/9x16', whatsapp: 'opening/9x16' }, fps: 30, fade: 0.4,
  attribution: 'Google Earth · Data providers as listed by Earth Studio' };
