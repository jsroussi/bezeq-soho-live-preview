// The teaser's measurements, shared by qa.mjs (every rendered frame) and contests/platform/test/teaser-60-days.test.js.
// Frames are raw pixels: { data, width, height, channels } (RGB or RGBA).

export const GROUND = [0x16, 0x25, 0x4f];                  // --bz-navy, the flat ground
export const SAFE_9x16 = { top: 250, bottom: 300 };       // 1080×1920: rows 0–249 and 1620–1919 stay ground
const LOGO_BOX = [338, 374, 254, 434];                     // the official logo's own bbox (its SVG units)
const BET = [499, 706, 73, 79];                            // the logo's "ב" (rightmost letter), its SVG bbox

// The rows and columns holding anything but the ground (a channel more than `tol` off): [x0, y0, x1, y1] or null.
export function contentBox({ data, width, height, channels }, tol = 10) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * channels;
    for (let x = 0; x < width; x++) {
      const i = row + x * channels;
      if (Math.abs(data[i] - GROUND[0]) > tol || Math.abs(data[i + 1] - GROUND[1]) > tol || Math.abs(data[i + 2] - GROUND[2]) > tol) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}
export const safeOk = (box, height) => !box || (box[1] >= SAFE_9x16.top && box[3] < height - SAFE_9x16.bottom);

// The logo's cap height as rendered: the height of the white ink of its "ב", inside where the page drew the logo.
export function logoCap({ data, width, channels }, [lx, ly, lw, lh]) {
  const fx = (u) => lx + (u - LOGO_BOX[0]) / LOGO_BOX[2] * lw, fy = (v) => ly + (v - LOGO_BOX[1]) / LOGO_BOX[3] * lh;
  const pad = 0.12 * BET[3] / LOGO_BOX[3] * lh;
  const xa = Math.floor(fx(BET[0])), xb = Math.ceil(fx(BET[0] + BET[2])), ya = Math.floor(fy(BET[1]) - pad), yb = Math.ceil(fy(BET[1] + BET[3]) + pad);
  let top = Infinity, bottom = -Infinity;
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
    const i = (y * width + x) * channels;
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  return bottom >= top ? bottom - top + 1 : 0;
}

// The "60" against the route: the smallest gap (px) between the 60's ink box and the route's stroke (its half width
// taken off), over the given moments; negative means they touch.
const segBox = ([ax, ay], [bx, by], [x0, y0, x1, y1]) => {
  // distance from a segment to a rectangle (0 if they meet), sampled finely along the segment
  let d = Infinity;
  for (let k = 0; k <= 20; k++) {
    const x = ax + (bx - ax) * k / 20, y = ay + (by - ay) * k / 20;
    d = Math.min(d, Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)));
  }
  return d;
};
export async function sixtyClearance(page, times) {
  let min = Infinity, at = null;
  for (const t of times) {
    const [box, route] = await page.evaluate((x) => [window.n60Box(x), window.routeStroke(x)], t);
    if (!box || route.pts.length < 2) continue;
    for (let i = 1; i < route.pts.length; i++) {
      const g = segBox(route.pts[i - 1], route.pts[i], box) - route.width / 2;
      if (g < min) { min = g; at = t; }
    }
  }
  return { min, at };
}

// The route against the contest's stops (OT-3): it passes through every stop, in contest.json order (degrees off, and
// the index along the path where it comes closest).
const RAD = Math.PI / 180;
const unit = ([lo, la]) => [Math.cos(la * RAD) * Math.cos(lo * RAD), Math.cos(la * RAD) * Math.sin(lo * RAD), Math.sin(la * RAD)];
const angle = (a, b) => { const p = unit(a), q = unit(b); return Math.acos(Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2])) / RAD; };
export function stopVisits(path, stops) {
  let from = 0;
  const out = stops.map((s, i) => {
    let best = Infinity, at = -1;
    for (let k = from; k < path.length; k++) { const d = angle(path[k], s.ll); if (d < best) { best = d; at = k; } }
    from = Math.max(from, at);
    return { stop: i + 1, offDeg: +best.toFixed(3), at };
  });
  return out.map((v, i) => ({ ...v, ok: v.offDeg <= 0.01 && (i === 0 || v.at > out[i - 1].at) }));
}

// The height of a tile's city name as rendered: the rows of near-white ink (the city; the country is sky blue, the dates
// dimmed) inside the tile, between its "שבוע N" label and its dates.
export function cityInk({ data, width, channels }, [x, y, w, h]) {
  let top = Infinity, bottom = -Infinity;
  for (let yy = Math.round(y + 0.26 * h); yy < Math.round(y + 0.74 * h); yy++) for (let xx = Math.round(x + 8); xx < Math.round(x + w - 8); xx++) {
    const i = (yy * width + xx) * channels;
    if (data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225) { top = Math.min(top, yy); bottom = Math.max(bottom, yy); }
  }
  return bottom >= top ? bottom - top + 1 : 0;
}

// The sign-off's events (OT-2), read from the page frame by frame at 30 fps: the frame each one first happens, against
// the music's hit it must land on (±1 frame).
export async function signoffEvents(page) {
  const f = [], first = (fn) => f.findIndex(fn);
  for (let i = 540; i < 720; i++) f[i] = { i, ...(await page.evaluate((t) => ({ ...window.signoff(t), stamp: window.stampScale(t) }), i / 30)) };
  const at = (fn) => { const k = first((x) => x && fn(x)); return k < 0 ? null : k; };
  const fullFrom = at((x) => x.logoA >= 1 && x.logoS >= 1), fullTo = at((x) => x.i > 600 && x.logoS < 1) - 1;
  const ev = {
    stampContact: { frame: at((x) => x.stamp <= 1), want: [555, 585] },          // the clap at 18.5 s or 19.5 s
    logoAppears: { frame: at((x) => x.i >= 600 && x.logoA > 0), want: [600] },   // the whoosh at 20.0 s
    logoFull: { from: fullFrom, to: fullTo, seconds: +((fullTo - fullFrom + 1) / 30).toFixed(3), need: 0.8 },
    logoGone: { frame: at((x) => x.i > 600 && x.logoS <= 0) },                    // shrunk to a point inside 21–22 s
    snap: { frame: at((x) => x.i > 600 && x.fly === 0), want: [660] },           // the boom at 22.0 s
    lineIn: { frame: at((x) => x.lineK >= 1), want: [675] },                      // fully in by 22.5 s
    ring: { frame: at((x) => x.ringK >= 0), want: [690] },                         // the chime at 23.0 s
  };
  for (const e of Object.values(ev)) if (e.want) e.ok = e.frame != null && e.want.some((w) => Math.abs(e.frame - w) <= 1);
  ev.logoFull.ok = ev.logoFull.from <= 606 && ev.logoFull.to >= 629 && ev.logoFull.seconds >= 0.8;
  ev.logoGone.ok = ev.logoGone.frame != null && ev.logoGone.frame > 630 && ev.logoGone.frame <= 660;
  return ev;
}

// The shield as rendered on a hold frame (one without the pulse ring, which crosses these rows): the content box of its rows (above the division line), its width, height,
// centre offset from the frame's middle (px) and whether it touches an edge.
export function shieldBox(frame, E) {
  const top = Math.floor(E.cy - E.sh / 2 - 40), bottom = Math.ceil(E.lineY - E.lineSize);
  const sub = { ...frame, data: frame.data.subarray(top * frame.width * frame.channels, bottom * frame.width * frame.channels), height: bottom - top };
  const b = contentBox(sub);
  if (!b) return null;
  return { width: b[2] - b[0] + 1, height: b[3] - b[1] + 1, dx: +((b[0] + b[2]) / 2 - (frame.width - 1) / 2).toFixed(1), clipped: b[0] <= 0 || b[2] >= frame.width - 1 || b[1] === 0 };
}
