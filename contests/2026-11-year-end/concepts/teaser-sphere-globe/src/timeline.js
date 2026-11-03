// The teaser's timeline as pure functions of time: the page draws from it and scripts/audio.mjs scores from it, so a
// whoosh lands on its arc and the hit on the title. No clock, no randomness.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, s) => a + (b - a) * s;
export const ramp = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (s) => s * s * (3 - 2 * s);
export const easeInOut = (s) => (s < 0.5 ? 4 * s * s * s : 1 - (-2 * s + 2) ** 3 / 2);
export const easeOut = (s) => 1 - (1 - s) ** 3;

export const EARTH_KM = 6371;
const D = Math.PI / 180;

// lon/lat (degrees) → unit vector, matching three.js SphereGeometry's equirectangular UVs (lon 0 on +X, 90°E on −Z).
export const vec = ([lon, lat]) => [Math.cos(lat * D) * Math.cos(lon * D), Math.sin(lat * D), -Math.cos(lat * D) * Math.sin(lon * D)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
export const angle = (a, b) => Math.acos(clamp(dot(a, b), -1, 1));
export function slerp(a, b, s) {
  const w = angle(a, b);
  if (w < 1e-6) return a.slice();
  const k1 = Math.sin((1 - s) * w) / Math.sin(w), k2 = Math.sin(s * w) / Math.sin(w);
  return norm(a.map((v, i) => v * k1 + b[i] * k2));
}

// The nine legs: the homes → the first destination, then destination to destination; each ends on its arrival.
export function legs(cut, stops) {
  const out = []; let t = cut.legs.start;
  stops.forEach((s, i) => {
    const d = i === 0 ? cut.legs.first : cut.legs.each;
    out.push({ i, start: t, end: t + d, to: s.id });
    t += d;
  });
  return out;
}

// Camera distance (globe centre, Earth radii) that shows the globe at `zoom` of half the shorter side.
export const distFor = (cut, zoom) => 1 / Math.sin(Math.atan(zoom * Math.tan((cut.fovMin / 2) * D)));

// Camera keyframes: over Israel, each leg's middle, back over Israel.
export function cameraKeys(cut, stops, homeCentre) {
  const L = legs(cut, stops), israel = vec(cut.open.centre);
  const keys = [{ t: cut.out.start, dir: israel, dist: 1 + cut.open.altKm[1] / EARTH_KM }];
  let from = vec(homeCentre);
  L.forEach((leg, i) => {
    const to = vec(stops[i].ll), w = angle(from, to);
    const zoom = lerp(cut.route.zoomNear, cut.route.zoomFar, clamp(w / 2));
    keys.push({ t: (leg.start + leg.end) / 2 + (i === 0 ? 0.5 : 0), dir: norm(from.map((v, k) => v + to[k])), dist: distFor(cut, zoom) });
    from = to;
  });
  keys.push({ t: cut.home.end, dir: vec([cut.open.centre[0] - 6, cut.open.centre[1] + 2]), dist: distFor(cut, cut.home.zoom) });
  return keys;
}

export function camera(cut, keys, t) {
  if (t <= keys[0].t) {
    const s = easeOut(ramp(t, 0, cut.open.end + 0.4));
    return { dir: keys[0].dir, dist: 1 + lerp(cut.open.altKm[0], cut.open.altKm[1], s) / EARTH_KM };
  }
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (t <= b.t || i === keys.length - 1) {
      const s = easeInOut(ramp(t, a.t, b.t));
      return { dir: slerp(a.dir, b.dir, s), dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), s)) };
    }
  }
}

// What the score needs: chip pops, leg starts and arrivals, the title.
export function events(cut, stops) {
  const L = legs(cut, stops);
  return {
    chips: [0, 1, 2, 3].map((i) => cut.open.chipsAt + i * cut.open.chipStep),
    legs: L.map((l) => ({ start: l.start, end: l.end })),
    title: cut.title.in,
    duration: cut.duration,
  };
}
