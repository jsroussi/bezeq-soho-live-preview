// The globe behind every week change. Two looks over one renderer:
//  photo: a photographic Earth graded to the week's palette and time of day (flights, and the Golden hour stage)
//  atlas: a navy sphere, the land as cream dots, completed legs as lit arcs, the week's country rising as columns
// Textures ship inside the bundle as data URIs: WebGL refuses image files over file://.
import * as THREE from 'three';
import gsap from 'gsap';
import dayUrl from '../tex/earth_atmos_2048.jpg';
import nightUrl from '../tex/earth_lights_2048.png';
import cloudsUrl from '../tex/earth_clouds_1024.png';
import specUrl from '../tex/earth_specular_2048.jpg';
import normUrl from '../tex/earth_normal_2048.jpg';
import { LAND } from '../tex/land-points.js';
import { byLum, mix, tokens } from './theme.js';
import { tall } from './dom.js';

THREE.ColorManagement.enabled = false; // the scene's colours are the page's hex values, unconverted
const DEG = Math.PI / 180;
export const ll2v = (lng, lat, r = 1) => { const p = (90 - lat) * DEG, t = (lng + 180) * DEG; return new THREE.Vector3(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)); };
const frameAt = (dir) => { const p = dir.clone().normalize(); const n0 = new THREE.Vector3(0, 1, 0).sub(p.clone().multiplyScalar(p.y)); const n = n0.lengthSq() < 1e-6 ? new THREE.Vector3(0, 0, 1) : n0.normalize(); const e = new THREE.Vector3().crossVectors(n, p).normalize(); return { p, e, n }; };
const slerp = (a, b, t) => { const o = a.angleTo(b), s = Math.sin(o); return s < 1e-5 ? a.clone() : a.clone().multiplyScalar(Math.sin((1 - t) * o) / s).add(b.clone().multiplyScalar(Math.sin(t * o) / s)); };
const col = (h) => new THREE.Color(h);
const load = (url) => new Promise((res) => new THREE.TextureLoader().load(url, (t) => { t.anisotropy = 8; res(t); }));

// The week's light as a sun angle from the city's zenith (and which side it is on).
const SUN = { morning: [74, 1], noon: [48, -1], golden: [80, -1], dusk: [89, -1], blue: [96, -1], night: [112, -1] };

export function gradeFor(week, peak = false) {
  const t = tokens(week, peak), s = byLum(peak ? week.peakDay.palette : week.palette), deep = s[0], light = s[s.length - 1];
  return { warm: mix(light, '#FFE2B8', 0.45), dusk: t['--w-accent'], sea: mix(deep, '#000000', 0.42), lights: mix(light, '#FFDFAE', 0.55), haze: s[s.length - 2] ?? light, space: mix(deep, '#000000', 0.78) };
}

const VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const EARTH_FS = `
uniform sampler2D uDay, uNight, uSpec, uClouds, uNorm; uniform vec3 uSun, uWarm, uSea, uLights, uHaze, uDusk; uniform float uNightBoost, uCloudShift, uCityGlow; uniform vec3 uCity;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 N = normalize(vN); vec3 L = normalize(uSun); vec3 V = normalize(cameraPosition - vW);
  vec3 nm = texture2D(uNorm, vUv).xyz * 2.0 - 1.0; vec3 T = normalize(cross(vec3(0.0,1.0,0.0), N)); vec3 B = cross(N, T);
  vec3 Nb = normalize(N + (T * nm.x + B * nm.y) * 0.35);
  float ndl = dot(Nb, L), ndl0 = dot(N, L);
  vec3 day = texture2D(uDay, vUv).rgb; float sea = texture2D(uSpec, vUv).r;
  float lum = dot(day, vec3(0.299, 0.587, 0.114));
  vec3 land = mix(vec3(lum), day, 0.55) * mix(vec3(1.0), uWarm * 1.15, 0.45);
  vec3 water = uSea * (0.7 + 0.8 * lum);
  vec3 base = mix(land, water, sea);
  float dayMask = smoothstep(-0.06, 0.25, ndl0);
  float dusk = exp(-pow((ndl0 - 0.05) / 0.15, 2.0));
  vec3 col = base * (0.06 + 1.25 * max(ndl, 0.0)) * mix(vec3(1.0), uWarm, 0.55);
  col += uDusk * dusk * (0.26 - 0.1 * sea);
  vec3 R = reflect(-L, N); col += uWarm * pow(max(dot(R, V), 0.0), 60.0) * sea * dayMask * 0.6;
  float cl = texture2D(uClouds, vUv + vec2(uCloudShift, 0.0)).a; col *= 1.0 - cl * 0.35 * dayMask;
  float night = 1.0 - smoothstep(-0.2, 0.06, ndl0);
  vec3 lights = texture2D(uNight, vUv).rgb;
  float near = exp(-pow(acos(clamp(dot(normalize(vW), normalize(uCity)), -1.0, 1.0)) / 0.05, 2.0));
  col += lights * uLights * night * (1.1 + uNightBoost + near * uCityGlow * 3.0);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col = mix(col, uHaze * (0.25 + 0.75 * dayMask) + uDusk * dusk * 0.4, fr * 0.6 * (0.2 + 0.8 * smoothstep(-0.3, 0.2, ndl0)));
  gl_FragColor = vec4(col, 1.0);
}`;
const CLOUD_FS = `uniform sampler2D uClouds; uniform vec3 uSun, uWarm, uDusk; uniform float uCloudShift; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vec3 N = normalize(vN); float ndl = dot(N, normalize(uSun)); float a = texture2D(uClouds, vUv + vec2(uCloudShift, 0.0)).a;
  float dayMask = smoothstep(-0.12, 0.3, ndl); float dusk = exp(-pow((ndl - 0.05) / 0.16, 2.0));
  vec3 c = mix(uWarm * 0.95, uDusk, dusk * 0.8) * (0.25 + 0.9 * max(ndl, 0.0)) + vec3(0.03);
  gl_FragColor = vec4(c, a * (0.08 + 0.85 * dayMask)); }`;
const ATMO_FS = `uniform vec3 uSun, uHaze, uDusk; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float rim = clamp(pow(clamp(-dot(N, V), 0.0, 1.0) / 0.42, 1.6), 0.0, 1.0);
  float ndl = dot(N, normalize(uSun)); float dusk = exp(-pow((ndl + 0.05) / 0.25, 2.0));
  gl_FragColor = vec4(mix(uHaze, uDusk, dusk), rim * (0.08 + 0.9 * smoothstep(-0.35, 0.25, ndl)) * 0.9); }`;

// Atlas: the navy sphere, lit from the camera side, with a thin rim of Bezeq's highlight blue.
const ATLAS_FS = `uniform vec3 uBase, uLit, uRim; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float f = max(dot(N, V), 0.0);
  vec3 c = mix(uBase, uLit, pow(f, 1.6) * 0.55); c = mix(c, uRim, pow(1.0 - f, 4.0) * 0.55); gl_FragColor = vec4(c, 1.0); }`;
const DOTS_VS = `uniform float uSize; uniform vec3 uCity; uniform float uR; varying float vFace; varying float vNear;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normalize(position));
  vFace = clamp(dot(n, normalize(-mv.xyz)), 0.0, 1.0); float a = acos(clamp(dot(normalize(position), normalize(uCity)), -1.0, 1.0)); vNear = 1.0 - smoothstep(uR * 0.4, uR * 1.6, a);
  gl_PointSize = uSize * projectionMatrix[1][1] / -mv.z * (0.55 + 0.45 * vFace); gl_Position = projectionMatrix * mv; }`;
const DOTS_FS = `uniform vec3 uDot, uHot; varying float vFace; varying float vNear;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float a = smoothstep(0.5, 0.3, d);
  gl_FragColor = vec4(mix(uDot, uHot, vNear), a * (0.18 + 0.62 * vFace) * (1.0 + vNear * 0.6)); }`;
const ARC_FS = `uniform vec3 uC; uniform float uP, uO, uDash; varying vec2 vUv; void main(){ if (vUv.x > uP) discard; if (uDash > 0.5 && fract(vUv.x * 40.0) > 0.55) discard; gl_FragColor = vec4(uC, uO * (0.35 + 0.65 * smoothstep(0.0, 0.2, vUv.x))); }`;

export async function createGlobe(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const pr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pr);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, 0.01, 200);
  const [day, night, clouds, spec, norm] = await Promise.all([dayUrl, nightUrl, cloudsUrl, specUrl, normUrl].map(load));
  const U = { uDay: { value: day }, uNight: { value: night }, uSpec: { value: spec }, uClouds: { value: clouds }, uNorm: { value: norm }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uWarm: { value: col('#FFB873') }, uSea: { value: col('#1B1511') }, uLights: { value: col('#FFC27A') }, uHaze: { value: col('#FFAE70') }, uDusk: { value: col('#FF6E3A') }, uNightBoost: { value: 0 }, uCloudShift: { value: 0 }, uCity: { value: new THREE.Vector3(0, 1, 0) }, uCityGlow: { value: 0 } };

  // photo look
  const photo = new THREE.Group(); scene.add(photo);
  photo.add(new THREE.Mesh(new THREE.SphereGeometry(1, 192, 128), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: EARTH_FS, uniforms: U })));
  photo.add(new THREE.Mesh(new THREE.SphereGeometry(1.009, 160, 112), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: CLOUD_FS, uniforms: U, transparent: true, depthWrite: false })));
  photo.add(new THREE.Mesh(new THREE.SphereGeometry(1.045, 128, 96), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: ATMO_FS, uniforms: U, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })));
  const sp = new Float32Array(2400 * 3); for (let i = 0; i < 2400; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(60); sp.set([v.x, v.y, v.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  photo.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: col('#FFF1E0'), size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.5 })));

  // atlas look
  const atlas = new THREE.Group(); scene.add(atlas);
  const AU = { uBase: { value: col('#252E58') }, uLit: { value: col('#3A4680') }, uRim: { value: col('#33B5E0') } };
  atlas.add(new THREE.Mesh(new THREE.SphereGeometry(0.995, 128, 96), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: ATLAS_FS, uniforms: AU })));
  const pts = new Float32Array((LAND.length / 2) * 3); for (let i = 0; i < LAND.length / 2; i++) pts.set(ll2v(LAND[i * 2], LAND[i * 2 + 1], 1.001).toArray(), i * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const DU = { uSize: { value: 0.012 * 1080 * pr / 2 }, uCity: { value: new THREE.Vector3(0, 1, 0) }, uR: { value: 0.12 }, uDot: { value: col('#EBECED') }, uHot: { value: col('#FFFFFF') } };
  atlas.add(new THREE.Points(pg, new THREE.ShaderMaterial({ vertexShader: DOTS_VS, fragmentShader: DOTS_FS, uniforms: DU, transparent: true, depthWrite: false })));
  const grat = []; for (let lat = -75; lat <= 75; lat += 15) for (let lng = -180; lng < 180; lng += 3) grat.push(ll2v(lng, lat, 1.002), ll2v(lng + 3, lat, 1.002));
  for (let lng = -180; lng < 180; lng += 15) for (let lat = -84; lat < 84; lat += 3) grat.push(ll2v(lng, lat, 1.002), ll2v(lng, lat + 3, 1.002));
  atlas.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grat), new THREE.LineBasicMaterial({ color: col('#33B5E0'), transparent: true, opacity: 0.1, depthWrite: false })));
  atlas.add(new THREE.HemisphereLight(0xffffff, 0x20294d, 1.3));
  const sunA = new THREE.DirectionalLight(0xffffff, 1.4); atlas.add(sunA);

  // the route: one arc per leg, drawn with progress; solid when travelled, dashed ahead
  const routeGroup = new THREE.Group(); scene.add(routeGroup);
  let legs = [];
  function setRoute(weeks, current, color, look) {
    routeGroup.clear(); legs = [];
    for (let i = 0; i < weeks.length - 1; i++) {
      const A = ll2v(weeks[i].lng, weeks[i].lat), B = ll2v(weeks[i + 1].lng, weeks[i + 1].lat), o = A.angleTo(B), hgt = 0.02 + 0.16 * (o / Math.PI);
      const curve = new THREE.Curve(); curve.getPoint = (t, target = new THREE.Vector3()) => target.copy(slerp(A, B, t).normalize().multiplyScalar(1.004 + hgt * Math.sin(Math.PI * t)));
      const done = i < current, ahead = i >= current;
      const mk = (r, op) => { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, r, 6), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: ARC_FS, uniforms: { uC: { value: col(done ? color : look === 'atlas' ? '#EBECED' : '#FFF1E0') }, uP: { value: 1 }, uO: { value: ahead ? op * 0.45 : op }, uDash: { value: ahead ? 1 : 0 } } })); routeGroup.add(m); return m; };
      legs.push([mk(look === 'atlas' ? 0.0028 : 0.0018, 1), mk(0.008, 0.16)]);
    }
  }
  const legProgress = (i, p) => { for (const m of legs[i] ?? []) m.material.uniforms.uP.value = p; };

  // the week's country rising out of the atlas: columns on the land dots around the city
  const columns = new Map();
  function columnsFor(week, palette, accent) {
    const key = `${week.index}:${palette.join()}`; if (columns.has(key)) return columns.get(key);
    const C = ll2v(week.lng, week.lat), R = 0.16, picks = [];
    for (let i = 0; i < LAND.length / 2; i++) { const v = ll2v(LAND[i * 2], LAND[i * 2 + 1]); const a = v.angleTo(C); if (a < R) picks.push([v, a]); }
    if (!picks.length) picks.push([C, 0]);
    const geo = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); geo.translate(0, 0.5, 0);
    const nrm = geo.attributes.normal, shade = new Float32Array(nrm.count * 3);
    for (let i = 0; i < nrm.count; i++) { const k = nrm.getY(i) > 0.5 ? 1.0 : nrm.getX(i) > 0.5 ? 0.82 : nrm.getZ(i) > 0.5 ? 0.7 : 0.58; shade.set([k, k, k], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(shade, 3));
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }), picks.length);
    const s = byLum(palette), cDeep = col(s[0]), cTop = col(s[s.length - 1]), cMid = col(s[Math.floor(s.length / 2)]);
    const base = picks.map(([v, a], i) => { const k = 1 - a / R, n = 0.55 + 0.45 * Math.abs(Math.sin(i * 12.9898) * 1.7 % 1); return { v, a, h: 0.014 + 0.26 * Math.pow(k, 1.8) * n, w: 0.0125 }; });
    base.forEach((b, i) => { const c = cMid.clone().lerp(cTop, Math.min(1, b.h / 0.14)).lerp(new THREE.Color(0xffffff), Math.max(0, (b.h - 0.18) / 0.3)); if (b.h < 0.03) c.lerp(cDeep, 0.5); if (b.h > 0.12) c.lerp(col(accent), Math.min(0.75, (b.h - 0.12) * 5)); mesh.setColorAt(i, c); });
    const item = { mesh, base, grow: 0, ring: 0, C };
    columns.set(key, item); return item;
  }
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), sc = new THREE.Vector3();
  function layoutColumns(item) {
    item.base.forEach((b, i) => {
      const grow = Math.max(0, Math.min(1, item.grow * 1.6 - b.a / 0.16 * 0.6));
      let hgt = b.h * grow; if (item.ring > 0) { const ringH = 0.02 + 0.24 * Math.exp(-Math.pow((b.a - 0.095) / 0.028, 2)); hgt = THREE.MathUtils.lerp(hgt, ringH * grow, item.ring); }
      q.setFromUnitVectors(up, b.v.clone().normalize()); sc.set(b.w, Math.max(hgt, 0.0001), b.w); m4.compose(b.v.clone().multiplyScalar(1.0), q, sc); item.mesh.setMatrixAt(i, m4);
    });
    item.mesh.instanceMatrix.needsUpdate = true;
  }
  let liveCols = null;
  function showColumns(week, palette, { instant = false, ring = 0, accent = week.accent } = {}) {
    const item = columnsFor(week, palette, accent);
    if (liveCols && liveCols !== item) { const old = liveCols; gsap.to(old, { grow: 0, duration: instant ? 0 : 0.6, ease: 'power2.in', onUpdate: () => layoutColumns(old), onComplete: () => old.mesh.removeFromParent() }); }
    liveCols = item; if (!item.mesh.parent) atlas.add(item.mesh);
    gsap.to(item, { grow: 1, ring, duration: instant ? 0 : 1.4, ease: 'power3.out', onUpdate: () => layoutColumns(item) }); if (instant) layoutColumns(item);
    DU.uCity.value.copy(item.C);
  }

  // camera framings in the city's own frame (east, north, up), so every city gets the same shot. shift moves the globe
  // on screen as a fraction of the viewport; `tall` replaces values on portrait screens (or computes them from the
  // screen's width/height), where the field of view also widens so the globe keeps its width.
  const FRAMES = {
    hero: { dist: 2.25, east: 0.42, north: -0.3, tgt: 0.62, tgtN: -0.08, fov: 36, shift: [-0.03, -0.11], tall: { shift: [0, -0.08] } },
    near: { dist: 1.7, east: 0.22, north: -0.42, tgt: 0.88, tgtN: 0.06, fov: 40, shift: [0, 0] },
    atlas: { dist: 3.75, east: 0.55, north: -1.25, tgt: 0, tgtN: 0, fov: 34, shift: [-0.225, 0.02], tall: (a) => { const k = Math.max(0, Math.min(1, (a - 0.5) / 0.3)); return { dist: 3.45 + 0.8 * k, shift: [0, 0.14 - 0.01 * k] }; } },
    atlasPeak: { dist: 2.05, east: 0.32, north: -0.95, tgt: 0.7, tgtN: 0.06, fov: 36, shift: [-0.19, 0.055], tall: { shift: [0, 0.15] } },
    porthole: { dist: 2.0, east: 0.25, north: -0.38, tgt: 0.85, tgtN: 0.04, fov: 38, shift: [0, 0] },
  };
  const resolve = (F) => (F.tall && tall() ? { ...F, ...(typeof F.tall === 'function' ? F.tall(view.w / view.h) : F.tall) } : F);
  let view = { w: innerWidth, h: innerHeight, offX: 0, offY: 0 };
  function place(dir, F, extra = 0) {
    const f = frameAt(dir), a = view.w / view.h;
    const pos = f.p.clone().multiplyScalar(F.dist + extra).add(f.e.clone().multiplyScalar(F.east)).add(f.n.clone().multiplyScalar(F.north));
    const tgt = f.p.clone().multiplyScalar(F.tgt).add(f.n.clone().multiplyScalar(F.tgtN));
    camera.position.copy(pos); camera.up.copy(f.n); camera.lookAt(tgt);
    camera.fov = a < 1 ? (2 * Math.atan(Math.tan((F.fov * DEG) / 2) / a)) / DEG : F.fov;
    const w = view.w * pr, hh = view.h * pr; camera.setViewOffset(w, hh, (-F.shift[0] * view.w + view.offX) * pr, (-F.shift[1] * view.h + view.offY) * pr, w, hh); camera.updateProjectionMatrix();
  }
  const lerpF = (a, b, t) => Object.fromEntries(['dist', 'east', 'north', 'tgt', 'tgtN', 'fov', 'shift'].map((k) => [k, Array.isArray(a[k]) ? a[k].map((v, i) => v + (b[k][i] - v) * t) : a[k] + (b[k] - a[k]) * t]));

  let current = { dir: ll2v(0, 30), F: FRAMES.hero, look: 'photo' };
  function setLook(look) { photo.visible = look === 'photo'; atlas.visible = look === 'atlas'; current.look = look; }
  function sunFor(week, peak = false) {
    const [deg, side] = peak ? SUN.night : SUN[week.light] ?? SUN.golden, f = frameAt(ll2v(week.lng, week.lat));
    return f.p.clone().multiplyScalar(Math.cos(deg * DEG)).add(f.e.clone().multiplyScalar(side * Math.sin(deg * DEG))).add(f.n.clone().multiplyScalar(0.12)).normalize();
  }
  function setGrade(week, peak = false, duration = 0) {
    const g = gradeFor(week, peak), map = { uWarm: g.warm, uSea: g.sea, uLights: g.lights, uHaze: g.haze, uDusk: g.dusk };
    const sun = sunFor(week, peak);
    U.uCity.value.copy(ll2v(week.lng, week.lat)); U.uCityGlow.value = peak ? 1.2 : 0; U.uNightBoost.value = peak ? 0.4 : 0;
    if (!duration) { for (const [k, v] of Object.entries(map)) U[k].value.set(v); U.uSun.value.copy(sun); scene.background = null; return; }
    for (const [k, v] of Object.entries(map)) { const c = col(v); gsap.to(U[k].value, { r: c.r, g: c.g, b: c.b, duration, ease: 'power2.inOut' }); }
    const from = U.uSun.value.clone(); const o = { t: 0 }; gsap.to(o, { t: 1, duration, ease: 'power2.inOut', onUpdate: () => U.uSun.value.copy(slerp(from, sun, o.t).normalize()) });
  }
  function setAtlasColors(week, peak = false) {
    const t = tokens(week, peak); DU.uHot.value.set(t['--w-light']); DU.uR.value = 0.11;
  }

  // Flight: from where the camera is to `week`, rising through orbit on the way. Returns a timeline.
  function flyTo(week, { frame = 'hero', duration = 2.2, rise = 1.4, leg = -1 } = {}) {
    const A = current.dir.clone(), B = ll2v(week.lng, week.lat), FA = current.F, FB = FRAMES[frame], o = { t: 0 };
    const tl = gsap.timeline();
    tl.to(o, { t: 1, duration, ease: 'power2.inOut', onUpdate: () => { const e = o.t; place(slerp(A, B, e), lerpF(resolve(FA), resolve(FB), e), rise * Math.sin(Math.PI * e)); if (leg >= 0) legProgress(leg, e); } });
    tl.add(() => { current = { ...current, dir: B, F: FB }; });
    return tl;
  }
  function frameNow(week, frame = 'hero') { current = { ...current, dir: ll2v(week.lng, week.lat), F: FRAMES[frame] }; place(current.dir, resolve(current.F)); }
  function project(week, r = 1.05) { const v = ll2v(week.lng, week.lat, r).project(camera); return [(v.x * 0.5 + 0.5) * view.w, (-v.y * 0.5 + 0.5) * view.h]; }

  function resize(w = innerWidth, h = innerHeight) { view = { ...view, w, h }; renderer.setSize(w, h, false); camera.aspect = w / h; DU.uSize.value = 0.012 * h * pr / 2; place(current.dir, resolve(current.F)); }
  resize();
  addEventListener('resize', () => resize());
  let raf = 0, running = false, t0 = performance.now();
  const tick = () => { U.uCloudShift.value = ((performance.now() - t0) / 1000) * 0.0009; sunA.position.copy(camera.position); renderer.render(scene, camera); if (running) raf = requestAnimationFrame(tick); };
  return {
    renderer, camera, FRAMES, setLook, setGrade, setAtlasColors, setRoute, legProgress, showColumns, flyTo, frameNow, project, resize,
    set offset([x, y]) { view.offX = x; view.offY = y; place(current.dir, resolve(current.F)); },
    start() { if (!running) { running = true; tick(); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    render() { sunA.position.copy(camera.position); renderer.render(scene, camera); },
  };
}
