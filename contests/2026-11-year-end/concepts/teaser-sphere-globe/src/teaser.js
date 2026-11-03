// The sphere-globe teaser: a night Earth, the four home cities' arcs flying the nine weeks in order, a ticker band
// wrapped round the globe, and the title back over Israel. Drawn frame by frame from src/timeline.js: window.teaser.frame(t)
// renders the moment t (seconds) and resolves when the page is ready to capture. Seeded, no clock, no network.
import * as THREE from '../vendor/three/three.module.js';
import { clamp, lerp, ramp, smooth, easeOut, easeInOut, vec, angle, slerp, legs, cameraKeys, camera } from './timeline.js';

const params = new URLSearchParams(location.search);
const D = await (await fetch(`/__teaser/data.json?cut=${params.get('cut') || 'master'}`)).json();
const { cut, stops, homes, palette } = D;
const W = cut.w, H = cut.h, U = Math.min(W, H) / 1080;
// chips read on a phone: their text is ≥ 2.4 % of the frame height in every cut (30 px at 1080, 48 px at 1920)
const K = H > W ? 1.6 : 1;
document.documentElement.style.setProperty('--u', `${U}px`);
document.documentElement.style.setProperty('--c', `${U * K}px`);

// ---- seeded randomness (stars only) ----
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = mulberry32(60_2026);

// ---- renderer ----
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.setClearColor(new THREE.Color(palette.navyDeep).multiplyScalar(0.08), 1);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(1, W / H, 0.05, 150);
const vFov = W >= H ? cut.fovMin : 2 * Math.atan(Math.tan((cut.fovMin / 2) * Math.PI / 180) * H / W) * 180 / Math.PI;
cam.fov = vFov;

const loader = new THREE.TextureLoader();
const tex = (url) => new Promise((ok, no) => loader.load(url, (t) => { t.anisotropy = renderer.capabilities.getMaxAnisotropy(); ok(t); }, undefined, no));
const [dayTex, nightTex, bandTex] = await Promise.all([tex('../textures/earth-day-4k.jpg'), tex('../textures/earth-night-4k.jpg'), tex(D.bandUrl)]);
dayTex.colorSpace = nightTex.colorSpace = THREE.NoColorSpace;

const col = (h) => new THREE.Color(h);
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// ---- the night Earth ----
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 128), new THREE.ShaderMaterial({
  uniforms: { day: { value: dayTex }, night: { value: nightTex }, sky: { value: col(palette.sky) }, deep: { value: col(palette.blueDeep) }, glow: { value: 1 } },
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: `uniform sampler2D day; uniform sampler2D night; uniform vec3 sky; uniform vec3 deep; uniform float glow;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() {
      vec3 d = texture2D(day, vUv).rgb, n = texture2D(night, vUv).rgb;
      float land = dot(d, vec3(0.30, 0.59, 0.11));
      float water = smoothstep(0.08, 0.02, d.r - d.b * 0.55 + 0.04);             // oceans read bluer than land
      vec3 base = mix(deep * 0.16, deep * 0.55 + vec3(0.03, 0.06, 0.10), smoothstep(0.05, 0.55, land));
      base = mix(base, deep * 0.22, water * 0.6);
      float L = dot(n, vec3(0.30, 0.59, 0.11));
      float lights = smoothstep(0.12, 0.95, L);
      vec3 city = mix(sky, vec3(1.0), smoothstep(0.35, 0.95, L)) * lights * 1.25 * glow;
      float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 3.0);
      gl_FragColor = vec4(base + city + sky * fres * 0.55, 1.0);
    }`,
}));
scene.add(earth);

const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.035, 128, 64), new THREE.ShaderMaterial({
  uniforms: { sky: { value: col(palette.sky) } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: `varying vec3 vN; varying vec3 vV; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: `uniform vec3 sky; varying vec3 vN; varying vec3 vV;
    void main() { float k = pow(clamp(0.72 + dot(vN, vV), 0.0, 1.0), 4.0); gl_FragColor = vec4(sky * k * 1.1, 1.0); }`,
}));
scene.add(atmosphere);

// ---- stars (seeded) ----
{
  const n = 2600, pos = new Float32Array(n * 3), size = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = 60, s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3); size[i] = 0.6 + rand() ** 6 * 2.6;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  scene.add(new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { k: { value: U } },
    vertexShader: 'attribute float size; uniform float k; varying float a; void main() { a = clamp(size / 2.2, 0.25, 1.0); gl_PointSize = size * k * 1.6; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float a; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.85, 0.93, 1.0), a * smoothstep(0.5, 0.1, d) * 0.8); }' })));
}

// ---- glow sprites (drawn once on a canvas, no images) ----
function glowTexture(ring) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (ring) { r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.72, 'rgba(255,255,255,0)'); r.addColorStop(0.86, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); }
  else { r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,0.85)'); r.addColorStop(0.45, 'rgba(255,255,255,0.22)'); r.addColorStop(1, 'rgba(255,255,255,0)'); }
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
}
const GLOW = glowTexture(false), RING = glowTexture(true);
const sprite = (map, colour) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: col(colour), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true })); scene.add(s); return s; };
const lighten = (h, k) => '#' + col(h).lerp(col('#FFFFFF'), k).getHexString();

// ---- arcs: one tube per home city per leg, colour + dash pattern ----
const arcMat = (home, length) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { colour: { value: col(home.colour) }, head: { value: 0 }, dim: { value: 1 }, duty: { value: home.dash.duty }, period: { value: home.dash.period }, len: { value: length }, glow: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 colour; uniform float head; uniform float dim; uniform float duty; uniform float period; uniform float len; uniform float glow; varying vec2 vUv;
    void main() {
      if (vUv.x > head) discard;
      if (period > 0.0 && fract(vUv.x * len * period) > duty) discard;
      float hot = smoothstep(head - 0.10, head, vUv.x) * (1.0 - step(0.999, head));
      float a = glow > 0.5 ? 0.22 : 1.0;
      gl_FragColor = vec4(colour * (0.85 + hot * 1.4) * dim * a, 1.0);
    }`,
});
const homeVec = homes.map((h) => vec(h.ll));
const homeCentre = [homes.reduce((s, h) => s + h.ll[0], 0) / homes.length, homes.reduce((s, h) => s + h.ll[1], 0) / homes.length];
const LEGS = legs(cut, stops);
const arcs = []; // { leg, home, mats, curve }
LEGS.forEach((leg, li) => {
  const to = vec(stops[li].ll);
  homes.forEach((home, hi) => {
    const from = li === 0 ? homeVec[hi] : vec(stops[li - 1].ll);
    const w = angle(from, to), lift = 0.06 + 0.32 * (w / Math.PI), off = (hi - 1.5) * (0.010 + 0.02 * w / Math.PI);
    const pts = [];
    for (let k = 0; k <= 96; k++) {
      const s = k / 96, p = v3(slerp(from, to, s)), side = new THREE.Vector3().crossVectors(v3(from), v3(to)).normalize();
      const r = 1.004 + lift * Math.sin(Math.PI * s) + hi * 0.006 * Math.sin(Math.PI * s);
      pts.push(p.multiplyScalar(r).addScaledVector(side, off * Math.sin(Math.PI * s)));
    }
    const curve = new THREE.CatmullRomCurve3(pts), length = curve.getLength();
    const radius = 0.0042 * (hi === 0 ? 1.1 : 1);
    const core = arcMat(home, length), halo = arcMat(home, length); halo.uniforms.glow.value = 1;
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 220, radius, 8, false), core));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 220, radius * 3.2, 8, false), halo));
    const headSprite = sprite(GLOW, lighten(home.colour, 0.4));
    arcs.push({ li, hi, curve, mats: [core, halo], headSprite });
  });
});

// ---- markers ----
const homeGlow = homes.map((h, i) => { const s = sprite(GLOW, h.colour); s.position.copy(v3(homeVec[i]).multiplyScalar(1.003)); return s; });
const destGlow = stops.map((s) => { const g = sprite(GLOW, lighten(s.accent, 0.45)); g.position.copy(v3(vec(s.ll)).multiplyScalar(1.003)); return g; });
const destRing = stops.map((s) => { const g = sprite(RING, lighten(s.accent, 0.6)); g.position.copy(v3(vec(s.ll)).multiplyScalar(1.004)); return g; });

// ---- the ticker band (an HTML strip pre-rendered to a texture: band.html) ----
bandTex.wrapS = THREE.RepeatWrapping; bandTex.colorSpace = THREE.SRGBColorSpace;
const BAND_R = 1.34, BAND_H = BAND_R * 2 * Math.PI / D.bandAspect / 2; // two copies round the ring keep the strip's aspect
const bandMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.FrontSide,
  uniforms: { map: { value: bandTex }, shift: { value: 0 }, fade: { value: 0 }, navy: { value: col(palette.navy) }, sky: { value: col(palette.sky) } },
  vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }',
  fragmentShader: `uniform sampler2D map; uniform float shift; uniform float fade; uniform vec3 navy; uniform vec3 sky; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() {
      vec2 uv = vec2(vUv.x * 2.0 + shift, vUv.y); // RepeatWrapping: no fract, so no mip seam
      vec4 t = texture2D(map, uv);
      float edge = smoothstep(0.05, 0.0, vUv.y) + smoothstep(0.95, 1.0, vUv.y);
      float face = smoothstep(0.0, 0.35, dot(normalize(vN), normalize(vV)));
      vec3 c = mix(navy, vec3(1.0), t.a); c = mix(c, sky, clamp(edge * 1.6, 0.0, 1.0));
      gl_FragColor = vec4(c, (0.86 + 0.14 * max(t.a, edge)) * fade * face);
    }`,
});
const band = new THREE.Mesh(new THREE.CylinderGeometry(BAND_R, BAND_R, BAND_H, 256, 1, true), bandMat);
band.renderOrder = 5;
const bandRig = new THREE.Group(); bandRig.add(band); scene.add(bandRig);

// ---- overlay ----
const $ = (id) => document.getElementById(id);
const bdi = (s) => s.replace(/[0-9][0-9.–\-]*/g, (m) => `<bdi dir="ltr">${m}</bdi>`);
const dashSvg = (h) => `<svg viewBox="0 0 44 10"><line x1="2" y1="5" x2="42" y2="5" stroke="${h.colour}" stroke-width="4" stroke-linecap="round" ${h.dash.period ? `stroke-dasharray="${(h.dash.duty * 400 / h.dash.period).toFixed(1)} ${((1 - h.dash.duty) * 400 / h.dash.period + 4).toFixed(1)}"` : ''}/></svg>`;
const homeChips = homes.map((h) => { const e = document.createElement('div'); e.className = 'chip'; e.innerHTML = `${dashSvg(h)}<span>${h.he}</span>`; $('chips').append(e); return e; });
const leaders = homes.map((h) => { const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('stroke', h.colour); $('leaders').append(l); return l; });
const destChips = stops.map((s) => { const e = document.createElement('div'); e.className = 'chip'; e.innerHTML = `<span class="dot" style="background:${palette.sky}"></span><span>${s.country}</span><bdi dir="ltr" class="code">${s.iata}</bdi>`; $('chips').append(e); return e; });
const [t1, t2] = D.title.name.split(' מסביב ');
$('title-name').innerHTML = `<span>${bdi(t1)}</span><span>מסביב ${t2}</span>`;
$('title-dates').innerHTML = `<bdi dir="ltr">${D.title.dates}</bdi>`;
$('title-mark').textContent = D.title.mark;
const tall = H > W;
Object.assign($('title').style, tall
  ? { left: '0', right: '0', textAlign: 'center', bottom: `${(cut.safe?.bottom ?? 0) + 70 * U}px` }
  : { right: `${150 * U}px`, top: '50%' });
$('title-name').style.fontSize = `${128 * U}px`;
$('title-dates').style.fontSize = `${(tall ? 50 : 54) * U}px`;
// the mark's letters (Simpler 700, cap height 0.54 em) stand ≥ 64 px tall in 9:16 and ≥ 48 px in 16:9
$('title-mark').style.fontSize = `${(tall ? 120 : 90) * U}px`;
if (tall) $('credit').style.bottom = `${(cut.safe?.bottom ?? 0) + 20 * U}px`;
$('credit').textContent = D.opening ? D.opening.attribution : '';

const place = (el, x, y, o, scale = 1) => { el.style.opacity = o.toFixed(3); el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`; };
const tmp = new THREE.Vector3();
function screen(p) { tmp.copy(p).project(cam); return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H]; }
function facing(p) { return smooth(ramp(p.clone().normalize().dot(cam.position.clone().sub(p).normalize()), 0.02, 0.25)); }

// ---- one frame ----
const KEYS = cameraKeys(cut, stops, homeCentre);
const ges = $('ges');
async function frame(t) {
  // camera
  const c = camera(cut, KEYS, t);
  cam.position.copy(v3(c.dir).multiplyScalar(c.dist));
  cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
  const sh = smooth(ramp(t, cut.home.start + 0.6, cut.home.end + 0.4));
  cam.clearViewOffset();
  if (sh > 0) cam.setViewOffset(W, H, -cut.shift.x * W * sh, -cut.shift.y * H * sh, W, H);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();

  // city lights swell a little as the arcs arrive
  earth.material.uniforms.glow.value = 0.92 + 0.12 * ramp(t, cut.legs.start, cut.home.end);
  const sizeK = c.dist; // sprites keep a steady screen size

  // homes
  // with the Google Earth shot on top, the chips wait for the hand-off and stay a moment longer
  const late = D.opening ? cut.open.end - D.opening.fade - cut.open.chipsAt : 0;
  const chipT = (i) => cut.open.chipsAt + late + i * (D.opening ? 0.15 : cut.open.chipStep);
  // each home city's chip (name + its line's dash) stays on its arc's start through the whole first leg
  const homesOut = 1 - ramp(t, LEGS[0].end + 0.2, LEGS[0].end + 0.8);
  homes.forEach((h, i) => {
    const on = easeOut(ramp(t, chipT(i), chipT(i) + 0.45));
    const p = homeGlow[i].position, f = facing(p);
    const pulse = 1 + 0.25 * Math.sin(Math.max(0, t - chipT(i)) * 5.0) * Math.exp(-Math.max(0, t - chipT(i)) * 1.2);
    homeGlow[i].scale.setScalar(0.022 * sizeK * pulse * (0.4 + 0.6 * on));
    homeGlow[i].material.opacity = on * f;
    const [x, y] = screen(p);
    const cx = x + h.chip.dx * U * K * (1 + 0.4 * (1 - on)), cy = y + h.chip.dy * U * K;
    place(homeChips[i], cx, cy, on * homesOut * f, 0.85 + 0.15 * on);
    leaders[i].setAttribute('x1', x.toFixed(1)); leaders[i].setAttribute('y1', y.toFixed(1));
    leaders[i].setAttribute('x2', (x + (cx - x) * 0.55).toFixed(1)); leaders[i].setAttribute('y2', (y + (cy - y) * 0.55).toFixed(1));
    leaders[i].style.opacity = (on * homesOut * f * 0.9).toFixed(3);
  });

  // arcs
  for (const a of arcs) {
    const leg = LEGS[a.li], s = easeInOut(ramp(t, leg.start, leg.end));
    const dim = t > leg.end ? lerp(1, 0.42, ramp(t, leg.end, leg.end + 1.2)) : 1;
    for (const m of a.mats) { m.uniforms.head.value = s; m.uniforms.dim.value = dim; }
    const drawing = s > 0 && s < 1;
    a.headSprite.visible = drawing;
    if (drawing) { a.curve.getPointAt(s, a.headSprite.position); a.headSprite.scale.setScalar(0.03 * sizeK); a.headSprite.material.opacity = facing(a.headSprite.position); }
  }

  // destinations
  stops.forEach((s, i) => {
    const arrive = LEGS[i].end, next = i < 8 ? LEGS[i + 1].end : cut.duration + 10;
    const lit = ramp(t, arrive - 0.05, arrive + 0.25), p = destGlow[i].position, f = facing(p);
    const burst = Math.exp(-Math.max(0, t - arrive) * 2.2) * lit;
    destGlow[i].scale.setScalar(sizeK * (0.03 + 0.05 * burst) * lit);
    destGlow[i].material.opacity = lit * f;
    const rk = ramp(t, arrive, arrive + 0.9);
    destRing[i].scale.setScalar(sizeK * (0.02 + 0.12 * easeOut(rk)));
    destRing[i].material.opacity = (1 - rk) * lit * f * (rk > 0 ? 1 : 0);
    // the chip: full while it is the latest arrival, then a quiet recap at the end
    const [o0, o1] = cut.chipOut; // when the previous stop's chip fades, seconds from the next arrival
    const live = easeOut(ramp(t, arrive, arrive + 0.35)) * (1 - ramp(t, next + o0, next + o1));
    const recap = ramp(t, cut.home.end - 1.2, cut.home.end) * 0.85;
    const o = Math.max(live, i === 8 ? live : recap * 0) * f;
    const [x, y] = screen(p);
    place(destChips[i], x, y - 46 * U * K, o, 0.9 + 0.1 * live);
  });

  // band
  const bIn = smooth(ramp(t, cut.band.in[0], cut.band.in[1]));
  bandMat.uniforms.fade.value = bIn;
  bandMat.uniforms.shift.value = t * cut.band.speed;
  bandRig.visible = bIn > 0;
  bandRig.quaternion.copy(cam.quaternion);
  bandRig.rotateX(cut.band.tilt); bandRig.rotateZ(cut.band.roll);
  bandRig.scale.setScalar(lerp(0.92, 1, bIn));

  // title, opening
  const ti = easeOut(ramp(t, cut.title.in, cut.title.in + 0.6));
  $('title').style.opacity = ti.toFixed(3);
  $('title').style.transform = `translateY(${tall ? 0 : -50}%) translateY(${((1 - ti) * 30 * U).toFixed(1)}px)`;

  if (D.opening) {
    const o = D.opening, n = o.frames.length, i = Math.min(n - 1, Math.floor(t * o.fps));
    const show = t < cut.open.end ? 1 - ramp(t, cut.open.end - o.fade, cut.open.end) : 0;
    ges.style.opacity = show.toFixed(3);
    if (show > 0) { if (ges.dataset.i !== String(i)) { ges.src = o.frames[i]; ges.dataset.i = String(i); await ges.decode(); } }
    $('credit').style.opacity = show > 0 ? '1' : '0';
  }

  renderer.render(scene, cam);
  await document.fonts.ready;
  return true;
}

await document.fonts.load('700 40px Simpler', 'בזק');
await document.fonts.load('400 40px Simpler', 'אב 1');
const fontsOk = document.fonts.check('700 40px Simpler', 'בזק') && document.fonts.check('400 40px Simpler', 'אב');
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.teaser = {
  frame, fontsOk, cut, legs: LEGS,
  env: { userAgent: navigator.userAgent, webgl: gl.getParameter(gl.VERSION), renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), three: THREE.REVISION },
};
await frame(Number(params.get('t') || 0));
window.teaserReady = true;
