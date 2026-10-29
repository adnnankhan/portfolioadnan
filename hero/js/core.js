/* Core: small shared helpers (U), the frame loop, canvas sizing, pointer tracking, and the registry (HX) that
   ground.js adds the hero to and boot.js starts. Loaded first. */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  var mm = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var U = {
    reduce: mm('(prefers-reduced-motion: reduce)'),
    TAU: Math.PI * 2,
    $: function (s, r) { return (r || document).querySelector(s); },
    $$: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    smooth: function (a, b, v) { var t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); },
    now: function () { return performance.now(); },
    // requestAnimationFrame loop; on a software renderer (U.lite) it draws every other frame
    loop: function (step) {
      var raf = 0, on = false, k = 0;
      function f(t) { if (!on) return; if (!U.lite || (k++ & 1) === 0) step(t); raf = requestAnimationFrame(f); }
      return { start: function () { if (on) return; on = true; raf = requestAnimationFrame(f); }, stop: function () { on = false; cancelAnimationFrame(raf); } };
    },
    dprMax: 2,
    sizeCanvas: function (cv, ctx) {
      var dpr = Math.min(U.dprMax, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
      cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { W: W, H: H };
    },
    // pointer position inside el, in CSS pixels
    track: function (el) {
      var p = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, vx: 0, vy: 0, inside: false, down: false, last: -1e9 };
      function pos(e) { var r = el.getBoundingClientRect(); p.x = e.clientX - r.left; p.y = e.clientY - r.top; p.last = performance.now(); }
      el.addEventListener('pointermove', function (e) { pos(e); p.inside = true; });
      el.addEventListener('pointerdown', function (e) { pos(e); p.down = true; p.inside = true; });
      window.addEventListener('pointerup', function () { p.down = false; });
      el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') p.inside = false; });
      p.tick = function () { if (p.px > -1e3) { p.vx = p.x - p.px; p.vy = p.y - p.py; } p.px = p.x; p.py = p.y; };
      return p;
    },
    // resolves once the three families are ready (or failed), so the first frame and the reveal use the right metrics
    fonts: function () {
      if (U._f) return U._f;
      U._f = !document.fonts ? Promise.resolve() : Promise.all(['400 40px Newsreader', 'italic 400 40px Newsreader', '400 20px "Instrument Sans"', '400 20px "DM Mono"'].map(function (f) { return document.fonts.load(f); })).catch(function () {});
      return U._f;
    }
  };
  // the canvas is drawn at full sharpness only with a hardware GPU; software renderers get a light 1x canvas
  U.dprMax = (function () {
    try {
      var c = document.createElement('canvas'), g = c.getContext('webgl') || c.getContext('experimental-webgl'); if (!g) return 1;
      var e = g.getExtension('WEBGL_debug_renderer_info'), r = String(e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)), l = g.getExtension('WEBGL_lose_context');
      if (l) l.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r) ? 1 : 2;
    } catch (x) { return 1; }
  })();
  U.lite = U.dprMax < 2; // without a GPU the sky also redraws at half rate
  window.HX = { U: U, list: [], add: function (n, d, f) { this.list.push({ name: n, desc: d, factory: f }); } };
})();
