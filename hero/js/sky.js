/* Sky: the sun, the moon, the sky colour and the dotted semicircle they travel on.

   Astronomy is real, for Kishanganj, India (26.105 N, 87.95 E): sunrise and sunset times, the sun's height (which sets
   the sky colour), the moon's phase and which side of it is lit. Positions use the low-precision formulas of the
   Astronomical Almanac (as in SunCalc). The path on screen is not the real track in the sky: it is an exact semicircle,
   on purpose, with time spread evenly along it.

   Look: the sky gradient follows the sun's altitude (night, blue hour, a warm sunrise or sunset, day). The sun is an
   over-exposed disc with a bloom that warms and flattens near the horizon. The moon is drawn pixel by pixel from a map
   of its seas, lit with a Lommel-Seeliger terminator. Sun and moon are the same size in the sky. */
(function () {
  // ---------- astronomy ----------
  var RAD = Math.PI / 180, DAY = 864e5, J1970 = 2440588, J2000 = 2451545, OBL = RAD * 23.4397, LAT = 26.105, LNG = 87.95, TAU = Math.PI * 2;
  function toDays(ms) { return ms / DAY - 0.5 + J1970 - J2000; }
  function ra(l, b) { return Math.atan2(Math.sin(l) * Math.cos(OBL) - Math.tan(b) * Math.sin(OBL), Math.cos(l)); }
  function dec(l, b) { return Math.asin(Math.sin(b) * Math.cos(OBL) + Math.cos(b) * Math.sin(OBL) * Math.sin(l)); }
  function azim(H, phi, d) { return Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(d) * Math.cos(phi)); }
  function alti(H, phi, d) { return Math.asin(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H)); }
  function sidereal(d, lw) { return RAD * (280.16 + 360.9856235 * d) - lw; }
  function refr(h) { if (h < 0) h = 0; return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179)); }
  function sunC(d) { var M = RAD * (357.5291 + 0.98560028 * d), C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)), L = M + C + RAD * 102.9372 + Math.PI; return { dec: dec(L, 0), ra: ra(L, 0) }; }
  function moonC(d) { var L = RAD * (218.316 + 13.176396 * d), M = RAD * (134.963 + 13.064993 * d), F = RAD * (93.272 + 13.22935 * d), l = L + RAD * 6.289 * Math.sin(M), b = RAD * 5.128 * Math.sin(F); return { ra: ra(l, b), dec: dec(l, b), dist: 385001 - 20905 * Math.cos(M) }; }
  function sunAt(ms) { var d = toDays(ms), c = sunC(d), H = sidereal(d, RAD * -LNG) - c.ra, h = alti(H, RAD * LAT, c.dec); return { az: azim(H, RAD * LAT, c.dec), alt: h + refr(h) }; }
  function moonAt(ms) { var d = toDays(ms), c = moonC(d), H = sidereal(d, RAD * -LNG) - c.ra, h = alti(H, RAD * LAT, c.dec); return { az: azim(H, RAD * LAT, c.dec), alt: h + refr(h) }; }
  function illum(ms) {
    var d = toDays(ms), s = sunC(d), m = moonC(d), sd = 149598000;
    var phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)), inc = Math.atan2(sd * Math.sin(phi), m.dist - sd * Math.cos(phi));
    return (1 + Math.cos(inc)) / 2;
  }
  function vec(b) { var c = Math.cos(b.alt); return [c * Math.sin(b.az), Math.sin(b.alt), c * Math.cos(b.az)]; }
  function fromVec(v) { return { az: Math.atan2(v[0], v[2]), alt: Math.asin(Math.max(-1, Math.min(1, v[1]))) }; }
  function ist(ms) { var dd = new Date(ms + 5.5 * 36e5), h = dd.getUTCHours(), m = dd.getUTCMinutes(); return ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM'); }

  // ---------- small helpers ----------
  function sm(a, b, v) { var t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, k) { return a.map(function (v, i) { return v + (b[i] - v) * k; }); }
  function css(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : clamp(a, 0, 1)).toFixed(3) + ')'; }
  function radial(ctx, x, y, r, stops) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function hash(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y) { return 0.5 * vnoise(x, y) + 0.25 * vnoise(x * 2.1, y * 2.1) + 0.125 * vnoise(x * 4.3, y * 4.3) + 0.0625 * vnoise(x * 8.7, y * 8.7); }

  // ---------- sky colour, keyed by the sun's altitude in degrees (zenith to horizon) ----------
  var SKYK = [
    [-90, ['#000004', '#020515', '#050C2A', '#0A1236']],
    [-18, ['#000004', '#020515', '#050C2A', '#0A1236']],
    [-12, ['#02061A', '#071232', '#0F1E4E', '#1C2C66']],
    [-6, ['#061036', '#11225A', '#2A3A80', '#55569A']],
    [-2, ['#0C1D4C', '#213B78', '#56609F', '#B98A93']],
    [3, ['#163676', '#305AA2', '#7690C4', '#EDB892']],
    [10, ['#183D86', '#2D5EAE', '#6893D2', '#B9D1F1']],
    [90, ['#153A84', '#2A5AAD', '#5B8BD1', '#A6C5EE']]
  ].map(function (k) { return [k[0], k[1].map(hex)]; });
  function skyAt(h) {
    for (var i = 1; i < SKYK.length; i++) if (h <= SKYK[i][0]) { var a = SKYK[i - 1], b = SKYK[i], k = sm(a[0], b[0], h); return a[1].map(function (c, j) { return mix(c, b[1][j], k); }); }
    return SKYK[SKYK.length - 1][1];
  }
  var GN = ['#14204A', '#09102A', '#03060F'].map(hex), GD = ['#2E4A8C', '#1A2C62', '#0A1330'].map(hex);

  // ---------- the moon, drawn pixel by pixel ----------
  // its seas in the moon's own frame (x right, y down, radius 1), roughly as seen with north up
  // seas as overlapping soft fields so they merge into the familiar shapes (x right, y down, radius 1, north up)
  var MARE = [
    [-0.62, -0.1, 0.26, 0.5, 1], [-0.7, 0.25, 0.16, 0.22, 0.8], [-0.5, -0.4, 0.2, 0.2, 0.9],   // Oceanus Procellarum
    [-0.3, -0.45, 0.27, 0.22, 1],                                                                  // Imbrium
    [-0.35, -0.7, 0.22, 0.06, 0.8], [0.05, -0.72, 0.22, 0.05, 0.7], [0.3, -0.66, 0.12, 0.05, 0.6],  // Frigoris
    [0.17, -0.4, 0.15, 0.15, 1], [0.33, -0.14, 0.21, 0.16, 1], [0.2, -0.05, 0.1, 0.1, 0.8],        // Serenitatis, Tranquillitatis
    [0.0, -0.22, 0.09, 0.07, 0.8], [-0.28, 0.05, 0.14, 0.12, 0.85], [-0.12, 0.38, 0.16, 0.14, 0.95], // Vaporum, Cognitum, Nubium
    [-0.46, 0.43, 0.1, 0.09, 0.95], [0.55, 0.13, 0.11, 0.2, 0.95], [0.35, 0.34, 0.08, 0.08, 0.9],  // Humorum, Fecunditatis, Nectaris
    [0.68, -0.3, 0.1, 0.12, 1], [0.86, 0.05, 0.05, 0.08, 0.6]                                      // Crisium, Smythii
  ];
  function albedo(u, v) {
    var a = 0.86 + 0.08 * (fbm(u * 4 + 3, v * 4 + 7) - 0.5), F = 0;
    var wu = u + 0.07 * (fbm(u * 3 + 1, v * 3 + 9) - 0.5), wv = v + 0.07 * (fbm(u * 3 + 4, v * 3 + 2) - 0.5);
    for (var k = 0; k < MARE.length; k++) { var M = MARE[k], dx = (wu - M[0]) / M[2], dy = (wv - M[1]) / M[3]; F += M[4] * Math.exp(-(dx * dx + dy * dy) * 1.4); }
    var m = sm(0.12, 1.05, F + 0.2 * (fbm(u * 6 + 11, v * 6 + 5) - 0.5));
    a -= 0.27 * m * (0.75 + 0.5 * fbm(u * 7, v * 7)) + 0.03 * (fbm(u * 2.5 + 5, v * 2.5 + 1) - 0.5);
    var tx = u + 0.1, ty = v - 0.72, tr = Math.sqrt(tx * tx + ty * ty);
    a += 0.18 * Math.exp(-tr * tr / 0.001) + 0.045 * Math.exp(-tr / 0.6) * Math.pow(Math.abs(Math.cos(Math.atan2(ty, tx) * 7)), 16);
    var cx = u + 0.3, cy = v + 0.1; a += 0.12 * Math.exp(-(cx * cx + cy * cy) / 0.0012);
    a += 0.05 * (fbm(u * 22 + 1, v * 22 + 2) - 0.5);
    return clamp(a, 0.3, 1.06);
  }
  var MOON = { cv: document.createElement('canvas'), D: 0, N: null, A: null, E: null, img: null };
  MOON.ctx = MOON.cv.getContext('2d');
  function moonBuild(D) {
    var o = MOON; o.D = D; o.cv.width = o.cv.height = D; o.img = o.ctx.createImageData(D, D);
    o.N = new Float32Array(D * D * 3); o.A = new Float32Array(D * D); o.E = new Float32Array(D * D);
    for (var j = 0; j < D; j++) for (var i = 0; i < D; i++) {
      var u = (i + 0.5) / D * 2 - 1, v = (j + 0.5) / D * 2 - 1, r = Math.sqrt(u * u + v * v), k = j * D + i;
      o.E[k] = clamp((1 - r) * D / 2 + 0.5, 0, 1);
      if (r < 1) { var z = Math.sqrt(1 - r * r); o.N[k * 3] = u; o.N[k * 3 + 1] = v; o.N[k * 3 + 2] = z; o.A[k] = albedo(u, v); }
    }
  }
  // f: lit fraction, lit: screen angle toward the sun, nightK: 1 at night (dark side shows), 0 by day (dark side is sky)
  function moonRender(f, lit, nightK) {
    var o = MOON, D = o.D, d = o.img.data, ia = Math.acos(clamp(2 * f - 1, -1, 1)), s = Math.sin(ia), L0 = s * Math.cos(lit), L1 = s * Math.sin(lit), L2 = Math.cos(ia);
    for (var k = 0, n = D * D; k < n; k++) {
      var e = o.E[k], p = k * 4; if (e <= 0) { d[p + 3] = 0; continue; }
      var nx = o.N[k * 3], ny = o.N[k * 3 + 1], nz = o.N[k * 3 + 2], mu0 = nx * L0 + ny * L1 + nz * L2, al = o.A[k];
      // Lommel-Seeliger: the moon stays nearly as bright to its edge, then a short soft terminator
      var mt = mu0 + 0.12 * (1 - nz) * Math.max(0, L2), ls = mt > 0 ? Math.min(1.25, 2 * Math.max(mu0, mt * 0.6) / (Math.max(mu0, mt * 0.6) + nz + 1e-4)) : 0, lum = al * ls * sm(-0.035, 0.07, mt), lk = Math.min(1, lum * 1.1);
      var es = al * 0.06 * nightK;
      var cool = clamp((0.84 - al) * 3, 0, 1);
      d[p] = clamp((246 - 14 * cool) * lum + (10 + 60 * es) * (1 - lk) * nightK, 0, 255);
      d[p + 1] = clamp((242 - 8 * cool) * lum + (14 + 70 * es) * (1 - lk) * nightK, 0, 255);
      d[p + 2] = clamp((234 + 4 * cool) * lum + (32 + 95 * es) * (1 - lk) * nightK, 0, 255);
      d[p + 3] = 255 * e * (nightK + (1 - nightK) * Math.min(1, lum * 1.15) * 0.9);
    }
    o.ctx.putImageData(o.img, 0, 0);
    return o.cv;
  }
  function drawMoon(ctx, x, y, r, f, lit, nightK) {
    var D = Math.ceil(r * 2 * Math.min(2, window.devicePixelRatio || 1)) + 2; if (D !== MOON.D) moonBuild(D);
    radial(ctx, x, y, r * 7, [[0, css([214, 226, 250], (0.06 + 0.16 * f) * (0.3 + 0.7 * nightK))], [0.35, css([214, 226, 250], (0.02 + 0.05 * f) * (0.3 + 0.7 * nightK))], [1, 'rgba(214,226,250,0)']]);
    ctx.drawImage(moonRender(f, lit, nightK), x - r, y - r, r * 2, r * 2);
  }

  // ---------- the sun: no shaded ball, just an over-exposed disc and the light around it ----------
  function drawSun(ctx, x, y, h, rs) {
    var low = sm(12, -1, h), warm = mix([255, 251, 242], [255, 186, 118], low), deep = mix([255, 244, 226], [255, 132, 74], low);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    radial(ctx, x, y, rs * 48, [[0, css(warm, 0.2 + 0.14 * low)], [0.22, css(warm, 0.07 + 0.06 * low)], [1, css(warm, 0)]]);
    radial(ctx, x, y, rs * 9, [[0, css(warm, 0.8)], [0.16, css(warm, 0.4)], [0.5, css(warm, 0.08)], [1, css(warm, 0)]]);
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + 0.05 * low, 1 - 0.13 * sm(3, -0.5, h));
    radial(ctx, 0, 0, rs * 1.6, [[0, '#FFFFFF'], [0.5, css(mix([255, 255, 255], [255, 232, 190], low))], [0.62, css(deep, 0.92)], [1, css(deep, 0)]]);
    ctx.restore();
  }
  // a warm glow on the horizon around the sun at dawn and dusk
  function horizonGlow(ctx, env, x, h) {
    var tw = Math.exp(-Math.pow((h + 2) / 8.5, 2)); if (tw < 0.01) return;
    var W = env.W, hy = env.hz(x), g = ctx.createRadialGradient(x, hy, 0, x, hy, W * 0.6);
    g.addColorStop(0, css([255, 176, 128], 0.42 * tw)); g.addColorStop(0.35, css([238, 150, 150], 0.16 * tw)); g.addColorStop(1, 'rgba(200,140,160,0)');
    ctx.save(); ctx.scale(1, 0.5); ctx.translate(0, hy / 0.5 - hy); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, hy, W * 0.6, 0, TAU); ctx.fill(); ctx.restore();
  }

  // ---------- shared bits ----------
  var IST = 5.5 * 36e5; // India Standard Time offset, ms
  function easeIO(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  // a soft light on the ground under a body (clipped to the ground), screen-blended
  function groundLight(ctx, env, x, a, rgb, wide) {
    if (a < 0.005 || !env.hzPts) return;
    var W = env.W, H = env.H, P = env.hzPts, hy = env.hz(clamp(x, 0, W));
    ctx.save(); ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (var i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
    ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.clip();
    ctx.globalCompositeOperation = 'screen'; ctx.translate(x, hy); ctx.scale(W * wide, H * 0.55);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, css(rgb, a)); g.addColorStop(0.25, css(rgb, a * 0.62)); g.addColorStop(0.6, css(rgb, a * 0.2)); g.addColorStop(1, css(rgb, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
  }

  // ---------- Sun and moon on one semicircle (final) ----------
  // One exact semicircle, centred on the page, its two ends resting on the horizon at the same height. By day the sun travels
  // it from the left end (sunrise in Kishanganj) to the right end (sunset), evenly in time. Push it past the right end and it
  // sets; the moon comes up in its place and travels back to the left through the night, with tonight's real phase. Push the
  // moon past the left end and the sun rises again. Only one of them is ever in the sky.
  // It opens at the real time and then stays put: nothing moves unless you drag the sun or the moon (or use the arrow keys on
  // it). The sky, the ground light and the stars all follow the time you set. The switch swaps day and night in place.
  function ARCSKY(name, desc) {
    var S = { T: Date.now(), mode: 'sun', phi: Math.PI / 2, drag: null, snap: null, fx: null, hov: false, foc: false, labNow: -1e9, la: 0, ring: 0, G: null, gk: '', rs: {}, knob: null, dnb: null };
    var PI = Math.PI;
    function dayOf(ms) { return Math.floor((ms + IST) / DAY) * DAY - IST; }
    function rsOf(D) { // sunrise and sunset for the day starting at D (midnight in India), to the minute
      if (S.rs[D]) return S.rs[D];
      var r = D + 6 * 36e5, s = D + 18 * 36e5, prev = null;
      for (var m = 0; m <= 1440; m += 2) { var al = sunAt(D + m * 6e4).alt; if (prev !== null) { if (prev < 0 && al >= 0) r = D + m * 6e4; if (prev >= 0 && al < 0) s = D + m * 6e4; } prev = al; }
      return (S.rs[D] = [r, s]);
    }
    function modeAt(T) { var rs = rsOf(dayOf(T)); return T >= rs[0] && T <= rs[1] ? 'sun' : 'moon'; }
    // the stretch of time the current body covers: the sun from sunrise to sunset, the moon from sunset to the next sunrise
    function segOf(T, mode) {
      var D = dayOf(T), rs = rsOf(D);
      if (mode === 'sun') return [rs[0], rs[1]];
      return T >= rs[1] ? [rs[1], rsOf(D + DAY)[0]] : [rsOf(D - DAY)[1], rs[0]];
    }
    // angle on the semicircle: PI is the left end, 0 the right end. The sun goes left to right, the moon right to left.
    function angleOf(T, mode) { var g = segOf(T, mode), u = clamp((T - g[0]) / (g[1] - g[0]), 0, 1); return mode === 'sun' ? PI * (1 - u) : PI * u; }
    function timeOf(th, mode, T) { var g = segOf(T, mode), u = clamp(th / PI, 0, 1); return mode === 'sun' ? g[1] - u * (g[1] - g[0]) : g[0] + u * (g[1] - g[0]); }
    function at(th) { var G = S.G; return { x: G.cx + G.R * Math.cos(th), y: G.cy - G.R * Math.sin(th) }; }
    // what a screen reader hears on the handle: the time shown, and whether it is the sun or the moon
    function aria() {
      if (!S.knob) return;
      var isNow = Math.abs(S.T - Date.now()) < 2 * 6e4, txt = (isNow ? 'Now, ' : '') + ist(S.T) + (S.mode === 'sun' ? ', the sun' : ', the moon') + ' in Kishanganj';
      if (S.knob.getAttribute('aria-valuetext') !== txt) { S.knob.setAttribute('aria-valuetext', txt); var d2 = new Date(S.T + IST); S.knob.setAttribute('aria-valuenow', String(Math.round((d2.getUTCHours() * 60 + d2.getUTCMinutes()) / 14.4))); }
    }

    PLANET(name, desc, {
      stars: 260, starC: '#E4ECFF', sparkle: true,
      sky: [[0, '#000004'], [0.55, '#020515'], [0.85, '#050C2A'], [1, '#0A1236']],
      ground: [[0, '#14204A'], [0.2, '#09102A'], [1, '#03060F']],
      atmo: ['rgba(140,170,255,0.8)', 'rgba(140,170,255,0.3)', 'rgba(211,229,251,0.75)', 20],
      rowNear: [150, 175, 235], rowFar: [195, 193, 244], rowA: [0.06, 0.34], cols: [[0, 'rgba(195,193,244,0.15)'], [1, 'rgba(150,175,235,0.38)']],
      accent: '#A9C8F7', dot: 'rgba(238,242,251,0.85)',
      farY: [0.7, 0.72],
      spots: [[0.3, 0.795], [0.66, 0.76], [0.15, 0.915], [0.8, 0.85]], spotsM: [[0.22, 0.705], [0.72, 0.735], [0.32, 0.83], [0.76, 0.89]],

      init: function (env) {
        var el = env.el, U = env.U, kn = el.querySelector('[data-sky]'), dnb = el.querySelector('[data-dn]');
        S.knob = kn; S.dnb = dnb; S.T = Date.now(); S.mode = modeAt(S.T); S.labNow = U.now() + 600;
        if (/[?&]debug/.test(location.search)) el._S = S;
        // ----- dragging the sun or the moon -----
        function ptr(e) { var r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
        function rawAngle(e) { var q = ptr(e), G = S.G, a = Math.atan2(G.cy - q[1], q[0] - G.cx); return a < -PI / 2 ? a + 2 * PI : a; } // -PI/2 .. 3PI/2
        function moveTo(phi) {
          var D = S.drag, P = S.G.push;
          // push past an end and the body sets there; the other one takes its place, rising from the same end
          if (phi <= -P && D.armR) { S.mode = S.mode === 'sun' ? 'moon' : 'sun'; D.armR = false; }
          if (phi >= PI + P && D.armL) { S.mode = S.mode === 'sun' ? 'moon' : 'sun'; D.armL = false; }
          if (phi > -P * 0.4) D.armR = true;
          if (phi < PI + P * 0.4) D.armL = true;
          S.phi = clamp(phi, -P, PI + P);
          S.T = timeOf(clamp(S.phi, 0, PI), S.mode, S.T);
        }
        if (kn) {
          kn.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (!S.G || S.fx) return;
            e.preventDefault(); e.stopPropagation();
            try { kn.setPointerCapture(e.pointerId); } catch (x) {}
            var a = rawAngle(e); S.snap = null;
            S.drag = { id: e.pointerId, off: S.phi - a, prev: a, armR: S.phi > -S.G.push * 0.4, armL: S.phi < PI + S.G.push * 0.4 };
            env.busy = true; el.classList.add('sky-drag'); kn.focus({ preventScroll: true });
          });
          kn.addEventListener('pointermove', function (e) {
            var D = S.drag; if (!D || e.pointerId !== D.id) return;
            var a = rawAngle(e), da = a - D.prev; if (da > PI) a -= 2 * PI; else if (da < -PI) a += 2 * PI; // no jumps across the bottom
            a = clamp(a, -PI / 2, 3 * PI / 2); D.prev = a; moveTo(a + D.off);
          });
          function end(e) {
            var D = S.drag; if (!D || (e && e.pointerId !== D.id)) return;
            S.drag = null; env.busy = false; el.classList.remove('sky-drag');
            // if it was let go while setting, it comes back up to the end of the path
            var to = clamp(S.phi, 0, PI); if (to !== S.phi) S.snap = { from: S.phi, to: to, t0: U.now(), dur: U.reduce ? 0 : 260 };
          }
          kn.addEventListener('pointerup', end); kn.addEventListener('pointercancel', end); kn.addEventListener('lostpointercapture', end);
          kn.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') S.hov = true; });
          kn.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') S.hov = false; });
          kn.addEventListener('focus', function () { var v = false; try { v = kn.matches(':focus-visible'); } catch (x) {} S.foc = v; }); kn.addEventListener('blur', function () { S.foc = false; });
          // keys: arrows move twenty minutes, page keys two hours, Home goes back to now
          kn.addEventListener('keydown', function (e) {
            var now = Date.now(), T;
            if (e.key === 'Home') T = now;
            else { var s = { ArrowRight: 1, ArrowUp: 1, PageUp: 6, ArrowLeft: -1, ArrowDown: -1, PageDown: -6 }[e.key]; if (s == null) return; T = S.T + s * 20 * 6e4; }
            e.preventDefault(); S.foc = true; if (S.fx || S.drag) return;
            S.T = T; S.mode = modeAt(T); S.phi = angleOf(T, S.mode); S.snap = null; aria(); if (e.key === 'Home') S.labNow = U.now();
          });
        }
        // the switch swaps day and night in place: the light fades through dusk or dawn, no body travels across the sky
        if (dnb) dnb.addEventListener('click', function () {
          if (S.fx || S.drag) return;
          var night = S.mode === 'sun', toT = dayOf(S.T) + (night ? 21.5 : 10) * 36e5, toM = night ? 'moon' : 'sun';
          if (U.reduce) { S.T = toT; S.mode = toM; S.phi = angleOf(toT, toM); return; }
          S.fx = { t0: U.now(), dur: 900, h0: S.hv, T: toT, mode: toM, swapped: false };
        });
      },

      pre: function (t, env) {
        var U = env.U, C = this, W = env.W, H = env.H, nar = env.narrow, el = env.el;
        // ----- the semicircle: as large as fits under the navigation, ends on the horizon. If the headline fits inside it,
        // it frames the headline; if not (phones), it sits between the headline and the horizon. -----
        // (the layout is only read every so often: on a resize, and a few times a second in case the fonts change the words' size)
        S.fc = (S.fc || 0) + 1;
        var cp = el.querySelector('.pl-copy'), nv = el.querySelector('.pl-nav'), m1 = cp && cp.querySelector('.mask > span');
        var gk = !S.G || S.fc % 15 === 0 || S.gW !== W || S.gH !== H ? W + 'x' + H + ':' + (cp ? cp.offsetHeight + ':' + cp.offsetWidth + ':' + (m1 ? m1.offsetWidth : 0) : '') : S.gk;
        S.gW = W; S.gH = H;
        if (gk !== S.gk || !S.G) {
          S.gk = gk;
          var er = el.getBoundingClientRect(), nb = 0, cr = cp ? cp.getBoundingClientRect() : null;
          // the lowest visible part of the navigation (its pills and buttons, not the padding around them). Read from offsets,
          // not boxes: on load the nav is still sliding in (the reveal), and a box read then made the arc start too small
          // and jump bigger a few seconds later.
          var topIn = function (e) { var y = 0; while (e && e !== el) { y += e.offsetTop; e = e.offsetParent; } return y; };
          if (nv) Array.prototype.forEach.call(nv.querySelectorAll('.pl-brand, .pl-links, .pl-meta > *'), function (e) { if (e.offsetHeight) nb = Math.max(nb, topIn(e) + e.offsetHeight); });
          if (!nb) nb = 60;
          var br = nar ? 12 : 14, cx = W / 2, Rmax = W * (nar ? 0.46 : 0.42);
          var solve = function (top) { // the largest radius whose highest point stays at or below "top"
            var lo = 30, hi = Rmax; if (env.hz(cx - hi) - hi >= top) return hi;
            for (var i = 0; i < 30; i++) { var md = (lo + hi) / 2; if (env.hz(cx - md) - md >= top) lo = md; else hi = md; }
            return lo;
          };
          var R = solve(nb + 20 + br), mode = 'frame', inside = true;
          if (cr) {
            // the lines of text themselves (not their box): each line's top corners must sit inside the circle, clear of the sun
            var ox = cr.left - er.left, oy = cr.top - er.top, cyA = env.hz(cx - R), lines = [];
            Array.prototype.forEach.call(cp.querySelectorAll('.mask > span, .pl-ctas > *'), function (e) { lines.push([ox + e.offsetLeft, oy + e.offsetTop, e.offsetWidth]); });
            var sub = cp.querySelector('.pl-sub'); if (sub && document.createRange) { var rg = document.createRange(); rg.selectNodeContents(sub); var rb = rg.getBoundingClientRect(); lines.push([rb.left - er.left, oy + sub.offsetTop, rb.width]); }
            lines.forEach(function (l) { if (Math.hypot(Math.max(Math.abs(l[0] - cx), Math.abs(l[0] + l[2] - cx)), cyA - l[1]) > R - br - 8) inside = false; });
            // phones: the words sit over the path, as on wide screens (he asked for that on 29 Oct 2026: kept apart, the hero
            // read as two separate things and ran too long); wider screens that can't fit them inside still put the path below
            if (nar) inside = true;
            else if (!inside) { var RB = solve(cr.bottom - er.top + 24 + br); if (RB >= 70) { R = RB; mode = 'below'; } }
          }
          S.G = { cx: cx, R: R, cy: env.hz(cx - R), br: br, nb: nb, mode: mode, fit: inside || mode === 'below', push: (2 * br + 12) / R, cb: cr ? [cr.left - er.left, cr.top - er.top, cr.right - er.left, cr.bottom - er.top] : null };
          if (!S.drag && !S.snap) S.phi = angleOf(S.T, S.mode);
        }
        var G = S.G;
        // ----- motion: only the drag, the snap back after a release, and the day/night swap -----
        if (S.snap) { var ps = S.snap.dur ? clamp((U.now() - S.snap.t0) / S.snap.dur, 0, 1) : 1; S.phi = S.snap.from + (S.snap.to - S.snap.from) * (1 - Math.pow(1 - ps, 3)); if (ps >= 1) S.snap = null; }
        var alpha = 1, h = sunAt(S.T).alt / RAD, hv = h;
        if (S.fx) {
          var k = clamp((U.now() - S.fx.t0) / S.fx.dur, 0, 1);
          if (k >= 0.42 && !S.fx.swapped) { S.fx.swapped = true; S.T = S.fx.T; S.mode = S.fx.mode; S.phi = angleOf(S.T, S.mode); }
          alpha = k < 0.42 ? 1 - k / 0.42 : (k - 0.42) / 0.58; alpha = alpha * alpha * (3 - 2 * alpha);
          var hTo = sunAt(S.fx.T).alt / RAD; hv = S.fx.h0 + (hTo - S.fx.h0) * easeIO(k); h = hv;
          if (k >= 1) S.fx = null;
        }
        if (!S.drag && !S.snap && !S.fx) S.phi = angleOf(S.T, S.mode);
        S.hv = hv; S.alpha = alpha;
        var pos = at(S.phi); S.pos = pos;
        // where the sun is when it is the moon's turn: just under the end it set at or will rise from (for the twilight glow)
        var gu = segOf(S.T, S.mode), uu = (S.T - gu[0]) / (gu[1] - gu[0]);
        S.sunX = S.mode === 'sun' ? pos.x : (uu < 0.5 ? G.cx + G.R : G.cx - G.R);
        // ----- the moon's real phase, and which side of it is lit (from where the sun really is at that moment) -----
        var mb = moonAt(S.T), sb = sunAt(S.T), mv = vec(mb), sv = vec(sb), dd = mv[0] * sv[0] + mv[1] * sv[1] + mv[2] * sv[2];
        var tg = [sv[0] - dd * mv[0], sv[1] - dd * mv[1], sv[2] - dd * mv[2]], tl = Math.hypot(tg[0], tg[1], tg[2]) || 1;
        var st = fromVec([mv[0] + tg[0] / tl * 0.03, mv[1] + tg[1] / tl * 0.03, mv[2] + tg[2] / tl * 0.03]);
        S.lit = Math.atan2(-(st.alt - mb.alt), (st.az - mb.az) * Math.cos(mb.alt)); S.f = illum(S.T);
        // ----- the sky, ground and horizon follow the sun's real height at the time shown -----
        var sk = skyAt(hv), dayK = U.smooth(-8, 8, hv); S.dayK = dayK; S.h = hv;
        // the pale band of sky sits low, along the horizon, so the words above it keep a deep blue behind them all day
        C.sky = [[0, css(sk[0])], [0.78, css(sk[1])], [0.95, css(sk[2])], [1, css(sk[3])]];
        env.starA = U.smooth(-5, -14, hv) * (1 - 0.3 * (S.mode === 'moon' ? S.f : 0));
        var g = GN.map(function (c, i) { return mix(c, GD[i], dayK); });
        C.ground = [[0, css(g[0])], [0.2, css(g[1])], [1, css(g[2])]];
        C.rowA = [0.06 + 0.04 * dayK, 0.34 + 0.06 * dayK];
        var atc = mix([140, 170, 255], [215, 232, 255], dayK);
        C.atmo = [css(atc, 0.8), css(atc, 0.3 + 0.15 * dayK), css(mix([211, 229, 251], [240, 246, 255], dayK), 0.75 + 0.15 * dayK), 20 + 6 * dayK];
        // ----- the handle you drag sits on the body; it carries the time for screen readers -----
        if (S.knob) {
          var kh = S.knob.offsetWidth / 2 || 22, kp = at(clamp(S.phi, 0, PI));
          var tf = 'translate(' + (kp.x - kh).toFixed(1) + 'px,' + (kp.y - kh).toFixed(1) + 'px)'; if (tf !== S.tf) { S.tf = tf; S.knob.style.transform = tf; }
          aria();
        }
        var nt = S.mode === 'moon';
        if (S.dnb && S.dnb._n !== nt) { S.dnb._n = nt; S.dnb.classList.toggle('night', nt); S.dnb.setAttribute('aria-pressed', nt ? 'true' : 'false'); S.dnb.setAttribute('aria-label', nt ? 'Switch to day' : 'Switch to night'); }
      },

      sky2: function (ctx, t, env) {
        var U = env.U, W = env.W, G = S.G, pos = S.pos, h = S.h, active = !!S.drag || S.hov || S.foc;
        if (!G) return;
        horizonGlow(ctx, env, S.sunX, h);
        // the path: an exact semicircle in evenly spaced dots, a little brighter near the body and while you hold it
        var n = Math.max(24, Math.round(PI * G.R / 9)), base = 0.17 + 0.13 * S.dayK;
        for (var i = 0; i <= n; i++) {
          var th = PI * i / n, q = at(th); if (q.y > env.hz(q.x) - 1.5) continue;
          var a = (base + 0.3 * Math.exp(-Math.abs(th - S.phi) * G.R / 70)) * (active ? 1.35 : 1);
          ctx.fillStyle = css([236, 242, 252], Math.min(0.85, a)); ctx.beginPath(); ctx.arc(q.x, q.y, 1.15, 0, TAU); ctx.fill();
        }
        // the body: the sun by day, the moon by night, never both, the same size in the sky
        var R = G.br, nightK = 1 - S.dayK;
        ctx.save(); ctx.globalAlpha = S.alpha;
        if (S.mode === 'sun') drawSun(ctx, pos.x, pos.y, Math.max(h, 0.5), R * 0.9);
        else drawMoon(ctx, pos.x, pos.y, R, Math.max(S.f, 0.12), S.lit, nightK);
        ctx.restore();
        // a thin ring says it can be picked up: on hover, focus and while held
        S.ring += ((active ? 1 : 0) - S.ring) * (U.reduce ? 1 : 0.18);
        if (S.ring > 0.02 && pos.y < env.hz(pos.x) + R) { ctx.strokeStyle = css([238, 242, 251], 0.5 * S.ring * S.alpha); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(pos.x, pos.y, R + 7, 0, TAU); ctx.stroke(); }
        // the time, in a small chip just outside the path: while held, on hover or focus, and for a moment after the page opens
        var want = active || (U.now() > S.labNow && U.now() - S.labNow < 3200) ? 1 : 0;
        S.la += (want - S.la) * (U.reduce ? 1 : 0.1);
        if (S.la > 0.02 && pos.y < env.hz(pos.x) - 2) {
          var isNow = Math.abs(S.T - Date.now()) < 2 * 6e4, label = (isNow ? 'Now · ' : '') + ist(S.T);
          ctx.font = '500 11px "DM Mono", ui-monospace, monospace';
          var cw = ctx.measureText(label).width + 16, ch = 20, rr = ch / 2, ux = Math.cos(S.phi), uy = -Math.sin(S.phi);
          var off = R + 14 + Math.abs(ux) * cw / 2 + Math.abs(uy) * ch / 2, lx = pos.x + ux * off, ly = pos.y + uy * off;
          // not over the navigation or the words: if the outside spot is taken, it goes on the inside of the path
          var hit = function (x, y) { var c = G.cb; return y - ch / 2 < G.nb + 14 || (c && x + cw / 2 > c[0] - 8 && x - cw / 2 < c[2] + 8 && y + ch / 2 > c[1] - 8 && y - ch / 2 < c[3] + 8); };
          if (hit(lx, ly)) { lx = pos.x - ux * off; ly = pos.y - uy * off; }
          // (on phones the words sit over the path: with no free spot, the moment after load is skipped rather than shown
          // through the words; while the body is held it still shows)
          // (and while it is held there, the chip sits on the ground just under the horizon, below the body, where it can be read)
          var blocked = hit(lx, ly) && !active, under = hit(lx, ly) && active;
          if (under) { lx = clamp(pos.x, cw / 2 + 8, W - cw / 2 - 8); ly = env.hz(lx) + ch / 2 + 12; }
          else { lx = clamp(lx, cw / 2 + 8, W - cw / 2 - 8); ly = Math.min(ly, env.hz(lx) - ch / 2 - 6); }
          var x0 = lx - cw / 2, y0 = ly - ch / 2;
          // (on the ground it has to be drawn after the ground, in ground2)
          var chip = function (ctx) {
          ctx.save(); ctx.globalAlpha = S.alpha;
          ctx.beginPath(); ctx.moveTo(x0 + rr, y0); ctx.arcTo(x0 + cw, y0, x0 + cw, y0 + ch, rr); ctx.arcTo(x0 + cw, y0 + ch, x0, y0 + ch, rr); ctx.arcTo(x0, y0 + ch, x0, y0, rr); ctx.arcTo(x0, y0, x0 + cw, y0, rr); ctx.closePath();
          ctx.fillStyle = css([6, 10, 28], (0.34 + 0.22 * S.dayK) * S.la); ctx.fill();
          ctx.strokeStyle = css([226, 234, 252], 0.14 * S.la); ctx.lineWidth = 1; ctx.stroke();
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = css([238, 242, 251], 0.92 * S.la);
          ctx.fillText(label, lx, ly + 0.5); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'; ctx.restore();
          };
          if (under) S.chipQ = chip; else if (!blocked) chip(ctx);
        }
      },

      ground2: function (ctx, t, env) {
        if (S.chipQ) { var q = S.chipQ; S.chipQ = null; q(ctx); }
        if (!S.G) return;
        var h = S.h, low = sm(32, 0, h) * sm(-5, 0.5, h), warm = mix([255, 238, 214], [255, 160, 104], low);
        groundLight(ctx, env, S.sunX, (0.06 * S.dayK + 0.16 * low) * (S.mode === 'sun' ? S.alpha : 1), warm, 0.3);
        if (S.mode === 'sun') groundLight(ctx, env, S.sunX, 0.3 * low * S.alpha, warm, 0.07);
        else { var mk = (1 - S.dayK) * S.f * sm(0, 0.35, Math.sin(clamp(S.phi, 0, PI))) * S.alpha; groundLight(ctx, env, S.pos.x, 0.08 * mk, [190, 210, 255], 0.26); groundLight(ctx, env, S.pos.x, 0.14 * mk, [205, 220, 255], 0.05); }
      }
    });
  }

  ARCSKY('Sun and moon', 'One exact semicircle over a centred headline. It opens at the real time in Kishanganj and stays still. Drag the sun to the right to move through the day; push it past the end and it sets, and the moon takes over and comes back through the night. The switch swaps day and night.');
})();
