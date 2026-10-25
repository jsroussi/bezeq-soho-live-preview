// Real-time Earth for the cinematic layer. Classic script; needs window.THREE and window.TEXTURES.
// Globe.create(canvas, weeks, origin, opts) -> api | null (null = no WebGL: the page uses the photo-only fallback).
//
// Two framings, blended by `orb` (0..1):
//   0 = globe: large, centred on the active city, labels on, drag to look around
//   1 = orb:   small porthole in the stage corner, over the destination photo; click it to open the map
(function () {
  'use strict';
  var DEG = Math.PI / 180;

  function latLng(lat, lng, r) {
    var phi = (90 - lat) * DEG, theta = (lng + 180) * DEG;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }
  function slerp(a, b, t) {
    var dot = Math.min(1, Math.max(-1, a.dot(b)));
    var om = Math.acos(dot);
    if (om < 1e-4) return a.clone();
    var s = Math.sin(om);
    return a.clone().multiplyScalar(Math.sin((1 - t) * om) / s).add(b.clone().multiplyScalar(Math.sin(t * om) / s));
  }
  var smooth = function (t) { return t * t * (3 - 2 * t); };

  var EARTH_VS = [
    'varying vec2 vUv; varying vec3 vN; varying vec3 vView;',
    'void main(){ vUv = uv; vN = normalize(normalMatrix * normal);',
    ' vec4 mv = modelViewMatrix * vec4(position,1.0); vView = normalize(-mv.xyz);',
    ' gl_Position = projectionMatrix * mv; }'
  ].join('\n');
  var EARTH_FS = [
    'uniform sampler2D uLand; uniform sampler2D uLights;',
    'uniform vec3 uOcean; uniform vec3 uLandCol; uniform vec3 uLightCol; uniform vec3 uRim; uniform float uGrid;',
    'varying vec2 vUv; varying vec3 vN; varying vec3 vView;',
    'float gridLine(float v, float step){ float f = abs(fract(v/step + 0.5) - 0.5) * step; float w = fwidth(v) * 1.1; return 1.0 - smoothstep(0.0, w, f); }',
    'void main(){',
    ' float land = smoothstep(0.3, 0.7, texture2D(uLand, vUv).r);',
    ' float lights = texture2D(uLights, vUv).r;',
    ' vec3 col = mix(uOcean, uLandCol, land);',
    ' float ndl = dot(vN, normalize(vec3(-0.4, 0.6, 0.7)));',
    ' col *= 0.55 + 0.6 * max(ndl, 0.0);',
    ' col += uLightCol * pow(lights, 1.6) * 1.35 * (0.35 + 0.65 * land);',
    ' float g = max(gridLine(vUv.x * 360.0, 15.0), gridLine(vUv.y * 180.0, 15.0));',
    ' col = mix(col, uRim, g * uGrid * (1.0 - land * 0.6));',
    ' float fr = pow(1.0 - max(dot(vN, vView), 0.0), 2.6);',
    ' col += uRim * fr * 0.6;',
    ' gl_FragColor = vec4(col, 1.0); }'
  ].join('\n');
  var ATMO_VS = 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
  var ATMO_FS = 'uniform vec3 uRim; varying vec3 vN; void main(){ float i = pow(max(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 0.0), 2.4); gl_FragColor = vec4(uRim, 1.0) * i * 0.95; }';
  var ROUTE_VS = 'varying float vT; void main(){ vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
  var ROUTE_FS = [
    'uniform vec3 uColor; uniform float uProgress; uniform float uDash; uniform float uAlpha; varying float vT;',
    'void main(){ if (vT > uProgress) discard;',
    ' float a = uAlpha; if (uDash > 0.5) a *= step(0.45, fract(vT * 34.0));',
    ' if (a < 0.01) discard; gl_FragColor = vec4(uColor, a); }'
  ].join('\n');

  function create(canvas, weeks, origin, opts) {
    opts = opts || {};
    if (!window.THREE || !window.TEXTURES) return null;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) { return null; }
    if (!renderer.getContext()) return null;
    var maxDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(maxDpr);
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    var loader = new THREE.TextureLoader();
    var tex = function (src) { var t = loader.load(src, function () { dirty = true; }); t.anisotropy = 4; return t; };

    var colors = {
      ocean: new THREE.Color(), land: new THREE.Color(), lights: new THREE.Color(), rim: new THREE.Color(),
      accent: new THREE.Color(), ink: new THREE.Color(),
    };
    var earthMat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VS, fragmentShader: EARTH_FS,
      extensions: { derivatives: true },
      uniforms: {
        uLand: { value: tex(TEXTURES.land) }, uLights: { value: tex(TEXTURES.lights) },
        uOcean: { value: colors.ocean }, uLandCol: { value: colors.land }, uLightCol: { value: colors.lights },
        uRim: { value: colors.rim }, uGrid: { value: 0.22 },
      },
    });
    var earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), earthMat);
    scene.add(earth);
    var atmo = new THREE.Mesh(new THREE.SphereGeometry(1.09, 64, 48), new THREE.ShaderMaterial({
      vertexShader: ATMO_VS, fragmentShader: ATMO_FS, side: THREE.BackSide, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uRim: { value: colors.rim } },
    }));
    scene.add(atmo);

    // ── route: departure leg (home → week 1), then week k → week k+1
    var stops = [origin].concat(weeks);
    var legs = [];
    for (var i = 1; i < stops.length; i++) {
      var a = latLng(stops[i - 1].lat, stops[i - 1].lng, 1).normalize();
      var b = latLng(stops[i].lat, stops[i].lng, 1).normalize();
      var ang = Math.acos(Math.min(1, a.dot(b)));
      var pts = [];
      for (var s = 0; s <= 64; s++) {
        var t = s / 64;
        pts.push(slerp(a, b, t).multiplyScalar(1.004 + (0.03 + 0.22 * ang / Math.PI) * Math.sin(Math.PI * t)));
      }
      var mat = new THREE.ShaderMaterial({
        vertexShader: ROUTE_VS, fragmentShader: ROUTE_FS, transparent: true, depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color() }, uProgress: { value: 1 }, uDash: { value: 1 }, uAlpha: { value: 0.5 } },
      });
      var mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.0042, 6, false), mat);
      scene.add(mesh);
      legs.push({ mesh: mesh, mat: mat, to: i - 1 });
    }

    // ── city markers
    var markers = weeks.map(function (w, i) {
      var n = latLng(w.lat, w.lng, 1).normalize();
      var g = new THREE.Group();
      g.position.copy(n.clone().multiplyScalar(1.002));
      g.lookAt(n.clone().multiplyScalar(2));
      var dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      var dot = new THREE.Mesh(new THREE.CircleGeometry(0.011, 20), dotMat);
      var ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.026, 40), ringMat);
      var pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      var pulse = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.034, 48), pulseMat);
      var beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.22, 8, 1, true), beamMat);
      beam.rotation.x = Math.PI / 2; beam.position.z = 0.11;
      var hit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.week = i;
      g.add(dot, ring, pulse, beam, hit);
      scene.add(g);
      return { g: g, n: n, dotMat: dotMat, ringMat: ringMat, pulse: pulse, pulseMat: pulseMat, beamMat: beamMat, hit: hit };
    });

    // ── state
    var view = {
      dir: latLng(weeks[0].lat - 14, weeks[0].lng, 1).normalize(),
      lift: 0, orb: 0, active: 0, reached: 0,
    };
    var W = 1, H = 1, dirty = true, running = true, flying = null, visible = true;
    var reduced = !!opts.reducedMotion;
    var labelsEl = opts.labels || null;
    var labelEls = [];
    if (labelsEl) {
      labelsEl.innerHTML = '';
      weeks.forEach(function (w, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'city-label';
        b.innerHTML = w.city + ' <small class="latin">' + w.code + '</small>';
        b.setAttribute('aria-label', 'שבוע ' + w.order + ': ' + w.city + ', ' + w.country);
        b.addEventListener('click', function () { if (opts.onSelect) opts.onSelect(i); });
        labelsEl.appendChild(b);
        labelEls.push(b);
      });
    }

    function sizes() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      dirty = true;
    }
    // Distance at which the globe's screen radius is `px`.
    function distFor(px) {
      var f = (H / 2) / Math.tan(camera.fov * DEG / 2);
      return Math.sqrt(1 + Math.pow(f / px, 2));
    }
    function orbRect() {
      var r = Math.max(46, Math.min(74, Math.min(W, H) * 0.09));
      return { r: r, x: r + 30, y: H - r - (opts.orbBottom != null ? opts.orbBottom : 150) };
    }

    function place() {
      var big = Math.min(W * 0.4, H * 0.43);
      var o = orbRect();
      var m = smooth(view.orb);
      var d = distFor(big) + (distFor(o.r) - distFor(big)) * m;
      d *= 1 + view.lift;
      camera.position.copy(view.dir).multiplyScalar(d);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      // Shift the framing so the globe sits on the orb's spot (setViewOffset moves the window, not the scene).
      var ox = (W / 2 - o.x) * m, oy = (H / 2 - o.y) * m;
      if (m > 0.0001) camera.setViewOffset(W, H, ox, oy, W, H); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }

    function applyRoute() {
      legs.forEach(function (l) {
        var done = l.to <= view.reached;
        l.mat.uniforms.uColor.value.copy(done ? colors.accent : colors.ink);
        l.mat.uniforms.uDash.value = done ? 0 : 1;
        l.mat.uniforms.uAlpha.value = done ? 0.95 : 0.4;
        if (!flying || l.to !== flying.leg) l.mat.uniforms.uProgress.value = 1;
      });
      markers.forEach(function (mk, i) {
        var on = i === view.active;
        var past = i <= view.reached;
        mk.dotMat.color.copy(on || past ? colors.accent : colors.ink);
        mk.ringMat.color.copy(on ? colors.accent : colors.ink);
        mk.ringMat.opacity = on ? 1 : past ? 0.7 : 0.35;
        mk.pulseMat.color.copy(colors.accent);
        mk.beamMat.color.copy(colors.accent);
        mk.beamMat.opacity = on ? 0.85 : 0;
        if (!on) mk.pulseMat.opacity = 0;
      });
      dirty = true;
    }

    var tmp = new THREE.Vector3();
    function updateLabels() {
      if (!labelEls.length) return;
      var show = view.orb < 0.05 && !flying;
      var camDir = camera.position.clone().normalize();
      markers.forEach(function (mk, i) {
        var el = labelEls[i];
        var facing = mk.n.dot(camDir);
        if (!show || facing < 0.25) { el.classList.add('is-hidden'); return; }
        tmp.copy(mk.n).multiplyScalar(1.02).project(camera);
        var x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%, calc(-100% - 12px))';
        el.classList.toggle('is-hidden', false);
        el.classList.toggle('is-active', i === view.active);
      });
    }

    // ── loop: render on demand; idle pulse at ~30fps; nothing when off-screen or tab hidden
    var last = 0, t0 = performance.now(), slow = 0, frames = 0;
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      var animating = dirty || flying || palTween;
      var idlePulse = !reduced && view.orb < 1;
      if (!animating && (!idlePulse || now - last < 33)) return;
      var dt = now - last; last = now;
      if (palTween) stepPalette(now);
      if (idlePulse) {
        var p = ((now - t0) / 1800) % 1;
        var mk = markers[view.active];
        mk.pulse.scale.setScalar(1 + p * 2.2);
        mk.pulseMat.opacity = (1 - p) * 0.8;
      }
      place();
      renderer.render(scene, camera);
      updateLabels();
      dirty = false;
      // Weak GPU guard: after warm-up, if frames keep taking > 45ms, drop resolution, then give up.
      if (++frames > 30 && dt > 45 && dt < 1000) {
        if (++slow === 40) renderer.setPixelRatio(0.75);
        if (slow === 120 && opts.onDegrade) opts.onDegrade();
      }
    }

    // ── palette (tweened in the loop)
    var palTween = null;
    function toColors(p) {
      var base = new THREE.Color(p.base), a = new THREE.Color(p.a), acc = new THREE.Color(p.accent), ink = new THREE.Color(p.ink || '#f6f2ea');
      return {
        ocean: base.clone().lerp(a, 0.22).multiplyScalar(0.9),
        land: a.clone().lerp(ink, 0.18).lerp(base, 0.25),
        lights: acc.clone().lerp(ink, 0.35),
        rim: acc.clone().lerp(a, 0.25),
        accent: acc, ink: ink,
      };
    }
    function setPalette(p, dur) {
      var to = toColors(p);
      if (!dur || reduced) {
        Object.keys(to).forEach(function (k) { colors[k].copy(to[k]); });
        applyRoute(); return;
      }
      var from = {};
      Object.keys(colors).forEach(function (k) { from[k] = colors[k].clone(); });
      palTween = { from: from, to: to, start: performance.now(), dur: dur * 1000 };
    }
    function stepPalette(now) {
      var t = Math.min(1, (now - palTween.start) / palTween.dur), e = smooth(t);
      Object.keys(colors).forEach(function (k) { colors[k].copy(palTween.from[k]).lerp(palTween.to[k], e); });
      applyRoute();
      if (t >= 1) palTween = null;
    }

    // ── flight
    function targetDir(i) { return latLng(weeks[i].lat - 14, weeks[i].lng, 1).normalize(); }
    function flyTo(i, o) {
      o = o || {};
      var from = view.dir.clone(), to = targetDir(i);
      // Re-draw the leg only on a forward hop along legs already flown (the contest's real progress).
      var leg = i === view.active + 1 && i <= view.reached ? i : -1;
      view.active = i;
      var dur = reduced ? 0 : (o.duration != null ? o.duration : 2.4);
      flying = { leg: leg };
      applyRoute();
      var lift = (o.lift != null ? o.lift : 0.8) * Math.min(1, from.angleTo(to) / 1.2 + 0.25);
      return new Promise(function (resolve) {
        if (!dur || !window.gsap) {
          view.dir.copy(to); view.lift = 0; flying = null; dirty = true; applyRoute(); resolve(); return;
        }
        var st = { t: 0 };
        if (flyTween) flyTween.kill();
        flyTween = gsap.to(st, {
          t: 1, duration: dur, ease: o.ease || 'power2.inOut',
          onUpdate: function () {
            view.dir.copy(slerp(from, to, st.t));
            view.lift = lift * Math.sin(Math.PI * st.t);
            if (leg >= 0) legs[leg].mat.uniforms.uProgress.value = Math.min(1, st.t * 1.08);
            dirty = true;
          },
          onComplete: function () { flying = null; view.lift = 0; flyTween = null; applyRoute(); resolve(); },
          onInterrupt: function () { flying = null; view.lift = 0; applyRoute(); resolve(); },
        });
      });
    }
    var flyTween = null;

    function setOrb(v, dur) {
      if (orbTween) orbTween.kill();
      if (!dur || reduced || !window.gsap) { view.orb = v; dirty = true; return Promise.resolve(); }
      return new Promise(function (resolve) {
        orbTween = gsap.to(view, { orb: v, duration: dur, ease: 'power3.inOut', onUpdate: function () { dirty = true; }, onComplete: resolve, onInterrupt: resolve });
      });
    }
    var orbTween = null;

    // Screen position of a week's city, for the photo reveal.
    function screenOf(i) {
      place();
      tmp.copy(markers[i].n).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H };
    }

    // ── input: drag to look around (globe framing), click a city / the orb
    var ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), down = null;
    canvas.addEventListener('pointerdown', function (e) {
      down = { x: e.clientX, y: e.clientY, dir: view.dir.clone(), moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!down || view.orb > 0.05 || flying) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true;
      if (!down.moved) return;
      var q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -dx * 0.005);
      var d = down.dir.clone().applyQuaternion(q);
      var lat = Math.asin(d.y) - dy * 0.004;
      lat = Math.max(-1.1, Math.min(1.2, lat));
      var h = Math.sqrt(d.x * d.x + d.z * d.z) || 1;
      view.dir.set(d.x / h * Math.cos(lat), Math.sin(lat), d.z / h * Math.cos(lat));
      dirty = true;
    });
    window.addEventListener('pointerup', function (e) {
      if (!down) return;
      var moved = down.moved; down = null;
      if (moved || e.target !== canvas) return;
      var r = canvas.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / W) * 2 - 1, -((e.clientY - r.top) / H) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      if (view.orb > 0.5) {
        if (ray.intersectObject(earth).length && opts.onOrb) opts.onOrb();
        return;
      }
      var hits = ray.intersectObjects(markers.map(function (m) { return m.hit; }));
      if (hits.length && opts.onSelect) opts.onSelect(hits[0].object.userData.week);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (down) return;
      var r = canvas.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / W) * 2 - 1, -((e.clientY - r.top) / H) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      var over = view.orb > 0.5 ? ray.intersectObject(earth).length : ray.intersectObjects(markers.map(function (m) { return m.hit; })).length;
      canvas.style.cursor = over ? 'pointer' : (view.orb > 0.5 ? 'default' : 'grab');
    });

    var ro = new ResizeObserver(sizes); ro.observe(canvas);
    var io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }); io.observe(canvas);
    sizes();
    requestAnimationFrame(frame);

    return {
      flyTo: flyTo,
      setOrb: setOrb,
      setPalette: setPalette,
      screenOf: screenOf,
      orbRect: orbRect,
      jump: function (i, reached) {
        view.active = i; view.reached = Math.max(i, reached || 0); view.dir.copy(targetDir(i)); view.lift = 0; applyRoute();
      },
      setReached: function (n) { view.reached = n; applyRoute(); },
      isOrb: function () { return view.orb > 0.5; },
      render: function () { dirty = true; },
      destroy: function () { running = false; ro.disconnect(); io.disconnect(); renderer.dispose(); },
    };
  }

  window.Globe = { create: create };
})();
