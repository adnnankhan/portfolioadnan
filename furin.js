/* The contact section's fūrin: a glass wind chime, its paper strip (tanzaku) hanging below. The strip is there to catch the
   wind, so that even a slight breeze swings the clapper against the glass: here the wind is the page's (a breeze, gusts
   now and then) and your pointer moving near it. When the clapper meets the glass, the bell rings (rings of sound drawn on
   the paper); press it and you hear it too. Copying the address rings it.
   The glass is drawn as glass: nearly clear, darker where it is seen edge-on, a long highlight, the rim left rough (as an
   Edo fūrin's is, so it rings); maple leaves are painted on the inside, and they turn as the bell turns in the wind.
   Furin(canvas, { reduce, night }) -> { ring(sound), draw } ; night() says whether the page is dark (the cord and the rings of
   sound are drawn in the page's ink) */
(function () {
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  // a small painted maple leaf (five points)
  function leafPath(x, s) {
    x.beginPath();
    for (var i = 0; i <= 60; i++) { var a = -Math.PI / 2 + i / 60 * TAU, r = .25;
      [[-Math.PI / 2, 1], [-Math.PI / 2 - .95, .9], [-Math.PI / 2 + .95, .9], [-Math.PI / 2 - 1.95, .55], [-Math.PI / 2 + 1.95, .55]].forEach(function (l) { var d = Math.cos(a - l[0]); if (d > 0) r = Math.max(r, l[1] * Math.pow(d, 3)); });
      var px = Math.cos(a) * r * s, py = Math.sin(a) * r * s; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath();
  }
  // the bell's outline, in its own frame: the knob at 0,0, the rim at y = 86
  function bellPath(x, k) {
    k = k || 1; x.beginPath(); x.moveTo(-53 * k, 86 * k); x.bezierCurveTo(-55 * k, 42 * k, -38 * k, 7 * k, 0, 5 * k); x.bezierCurveTo(38 * k, 7 * k, 55 * k, 42 * k, 53 * k, 86 * k); x.closePath();
  }
  var RIM = []; for (var i = 0; i <= 40; i++) RIM.push((Math.sin(i * 12.9898) * 43758.5453 % 1) * 1.3);

  window.Furin = function (cv, opt) {
    opt = opt || {};
    // drawn at a scale that follows the space it is given (it is designed at 320 px wide)
    var x = cv.getContext('2d'), W = 0, H = 0, DPR = 1, SC = 1;
    function size() { var r = cv.getBoundingClientRect(); SC = clamp(r.width / 320, .8, 1.4); W = r.width / SC; H = r.height / SC; DPR = Math.min(2, devicePixelRatio || 1); cv.width = r.width * DPR; cv.height = r.height * DPR; x.setTransform(DPR * SC, 0, 0, DPR * SC, 0, 0); }
    size(); addEventListener('resize', size);
    // the state: the bell on its cord (b), the strip on its string (s), the bell's slow turn (p)
    var S = { b: 0, vb: 0, s: 0, vs: 0, p: .6, vp: 0 }, rings = [], lastRing = -9, t = 0, last = 0, vis = false, raf = 0, sound = 0, gust = { t: -9, a: 0, d: 1 }, nextGust = 2.5;
    var ptr = { x: -1e3, y: -1e3, vx: 0, t: -9 };
    addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(), nx = (e.clientX - r.left) / SC, ny = (e.clientY - r.top) / SC, now = performance.now() / 1000;
      if (ptr.t > 0 && now - ptr.t < .1) ptr.vx = ptr.vx * .5 + (nx - ptr.x) / Math.max(now - ptr.t, .008) * .5; ptr.x = nx; ptr.y = ny; ptr.t = now; }, { passive: true });

    // the sound of glass: a few bright partials, not in tune with each other (a bell's), dying away at their own rates
    var AC = null;
    function chime(v) {
      try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      var now = AC.currentTime, out = AC.createGain(); out.gain.value = .09 * v; out.connect(AC.destination);
      [[2093, 1, 2.4], [4870, .45, 1.5], [8200, .22, .8], [2101, .5, 2.6]].forEach(function (p) {
        var o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = p[0] * (1 + (Math.random() - .5) * .004);
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(p[1], now + .004); g.gain.exponentialRampToValueAtTime(.0001, now + p[2]);
        o.connect(g); g.connect(out); o.start(now); o.stop(now + p[2] + .05); });
    }
    function ring(withSound) {
      if (t - lastRing < .18) return; lastRing = t;
      rings.push({ t: t, k: withSound ? 1 : .7 });
      if (withSound) sound = t + 4;
      if (withSound || t < sound) chime(withSound ? 1 : .45);
    }

    function wind() {
      var w = -34 - 12 * Math.sin(t * .6) - 8 * Math.sin(t * 1.7 + 1);
      var g = t - gust.t; if (g > 0 && g < gust.d) w -= gust.a * Math.sin(Math.PI * g / gust.d);
      // the pointer moving near the strip is a gust of its own
      var sx = W / 2 + Math.sin(S.s) * 150, sy = 260, d = Math.hypot(ptr.x - sx, ptr.y - sy), age = performance.now() / 1000 - ptr.t;
      if (d < 240 && age < .15) w += clamp(ptr.vx, -2500, 2500) * .5 * Math.pow(1 - d / 240, 2);
      return w;
    }
    function step(dt) {
      if (t > nextGust) { gust = { t: t, a: 120 + Math.random() * 140, d: 1 + Math.random() * .8 }; nextGust = t + 5 + Math.random() * 4; }
      var w = wind();
      // the strip: a pendulum the wind pushes; the bell: a slower one, tugged by the strip through the string
      var as = -47 * Math.sin(S.s) - 1.7 * S.vs + w * .07 + 6 * (S.b - S.s), ab = -24 * Math.sin(S.b) - 1.3 * S.vb + 2.2 * (S.s - S.b);
      S.vs += as * dt; S.vb += ab * dt; S.s += S.vs * dt; S.b += S.vb * dt;
      S.vp += ((w + 34) * .004 - .5 * S.vp) * dt; S.p += S.vp * dt + dt * .05;
      // the clapper swings with the strip; when it meets the glass, the bell rings
      var rel = S.s - S.b; if (Math.abs(rel) > .13 && Math.abs(S.vs - S.vb) > .35 && (rel * (S.vs - S.vb)) > 0) ring(false);
      rings = rings.filter(function (r) { return t - r.t < 1.6; });
    }

    function draw() {
      var night = !!(opt.night && opt.night()), INK = night ? '237,230,218' : '39,34,31';
      x.clearRect(0, 0, W, H);
      var ax = W / 2, CL = 104, bx = ax + Math.sin(S.b) * CL, by = Math.cos(S.b) * CL, rel = S.s - S.b;
      // the cord, coming down out of the light above
      var cg = x.createLinearGradient(0, 0, 0, by); cg.addColorStop(0, 'rgba(' + INK + ',0)'); cg.addColorStop(.5, 'rgba(' + INK + ',.55)'); cg.addColorStop(1, 'rgba(' + INK + ',.8)');
      x.strokeStyle = cg; x.lineWidth = 1.2; x.beginPath(); x.moveTo(ax, 0); x.quadraticCurveTo(ax + (bx - ax) * .5 + S.vb * 2, by * .5, bx, by); x.stroke();
      // the strip: hanging from the clapper on a string, bending and fluttering in the wind
      var px0 = bx + Math.sin(S.b) * 84, py0 = by + Math.cos(S.b) * 84, SL = 46, sx = px0 + Math.sin(S.s) * SL, sy = py0 + Math.cos(S.s) * SL;
      var N = 12, LEN = 150, SW = 40, pts = [], a = S.s, p = [sx, sy];
      for (var i = 0; i <= N; i++) { var k = i / N; pts.push(p.slice()); a = S.s + (S.vs * -.06) * Math.pow(k, 1.4) + Math.sin(t * 7 - k * 5) * .05 * k * Math.min(1, Math.abs(wind()) / 120); p = [p[0] + Math.sin(a) * LEN / N, p[1] + Math.cos(a) * LEN / N]; }
      function strip(ox, oy) { x.beginPath(); for (var i = 0; i <= N; i++) { var q = pts[i], r = pts[Math.min(N, i + 1)], o = pts[Math.max(0, i - 1)], dx = r[0] - o[0], dy = r[1] - o[1], d = Math.hypot(dx, dy) || 1; var px = q[0] - dy / d * SW / 2 + ox, py = q[1] + dx / d * SW / 2 + oy; i ? x.lineTo(px, py) : x.moveTo(px, py); }
        for (i = N; i >= 0; i--) { q = pts[i]; r = pts[Math.min(N, i + 1)]; o = pts[Math.max(0, i - 1)]; dx = r[0] - o[0]; dy = r[1] - o[1]; d = Math.hypot(dx, dy) || 1; x.lineTo(q[0] + dy / d * SW / 2 + ox, q[1] - dx / d * SW / 2 + oy); } x.closePath(); }
      // shadows on the paper behind (the light is above and to the left)
      x.save(); x.filter = 'blur(9px)'; x.fillStyle = night ? 'rgba(0,0,0,.4)' : 'rgba(39,34,31,.12)';
      x.save(); x.translate(bx + 18, by + 24); x.rotate(S.b); bellPath(x); x.fill(); x.restore(); strip(18, 24); x.fill(); x.restore();
      x.strokeStyle = 'rgba(' + INK + ',.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px0, py0); x.lineTo(sx, sy); x.stroke();
      strip(0, 0); var sg = x.createLinearGradient(sx - SW, 0, sx + SW, 0), sh = clamp(.5 + Math.sin(S.s) * 2, 0, 1);
      sg.addColorStop(0, 'rgb(' + Math.round(244 - 14 * sh) + ',' + Math.round(238 - 14 * sh) + ',' + Math.round(226 - 14 * sh) + ')'); sg.addColorStop(1, 'rgb(' + Math.round(232 + 18 * sh) + ',' + Math.round(225 + 18 * sh) + ',' + Math.round(212 + 18 * sh) + ')');
      x.fillStyle = sg; x.fill(); x.strokeStyle = 'rgba(39,34,31,.14)'; x.lineWidth = 1; x.stroke();
      // on the strip, written down it (as a tanzaku is): hello, and the lozenge of the mark at its foot
      x.fillStyle = 'rgba(39,34,31,.78)'; x.font = '500 11px "DM Mono", ui-monospace, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      'HELLO'.split('').forEach(function (ch, i) { var k = (2.6 + i * 1.55) / N * N, j = Math.min(N - 1, Math.floor(k)), f = k - j, q = [pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f];
        x.save(); x.translate(q[0], q[1]); x.rotate(-Math.atan2(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1])); x.fillText(ch, 0, 0); x.restore(); });
      var fq = pts[N - 1]; x.save(); x.translate(fq[0], fq[1]); x.rotate(Math.PI / 4 - S.s); x.fillStyle = '#C66B27'; x.fillRect(-3.4, -3.4, 6.8, 6.8); x.restore();
      // the sound, drawn: rings spreading from the bell (behind the glass)
      rings.forEach(function (rg) { for (var j = 0; j < 3; j++) { var e = (t - rg.t - j * .12) / 1.3; if (e <= 0 || e >= 1) continue;
        x.strokeStyle = 'rgba(' + INK + ',' + (.22 * rg.k * (1 - e)).toFixed(3) + ')'; x.lineWidth = 1; x.beginPath(); x.ellipse(bx, by + 50, 60 + e * 130, (60 + e * 130) * .42, S.b, 0, TAU); x.stroke(); } });
      // the bell
      x.save(); x.translate(bx, by); x.rotate(S.b);
      // through the glass: the leaves painted on its far side (seen from behind, fainter), the clapper inside
      x.save(); bellPath(x); x.clip();
      function paint(front) {
        for (var i = 0; i < 5; i++) { var ph = S.p + i * TAU / 5, c = Math.cos(ph); if ((c > 0) !== front) continue; var yy = 34 + (i % 2) * 22, rr = 18 + yy * .38;
          x.save(); x.translate(Math.sin(ph) * rr, yy); x.scale(Math.max(.12, Math.abs(c)), 1); x.rotate(i * 1.3 + .4); leafPath(x, 9 + (i % 3) * 2);
          x.fillStyle = front ? 'rgba(184,48,30,.82)' : 'rgba(184,48,30,.22)'; x.fill(); x.restore(); }
        // a painted line of wind round it
        x.beginPath(); for (var j = 0; j <= 40; j++) { var ph2 = j / 40 * TAU, c2 = Math.cos(ph2 + S.p * .7); if ((c2 > 0) !== front) { x.moveTo(Math.sin(ph2 + S.p * .7) * 48, 70 + Math.sin(ph2 * 3) * 3); continue; } x.lineTo(Math.sin(ph2 + S.p * .7) * 48, 70 + Math.sin(ph2 * 3) * 3); }
        x.strokeStyle = front ? 'rgba(198,107,39,.75)' : 'rgba(198,107,39,.2)'; x.lineWidth = front ? 1.6 : 1; x.stroke();
      }
      paint(false);
      x.fillStyle = 'rgba(' + INK + ',.28)'; x.beginPath(); x.roundRect ? x.roundRect(-3 + rel * 40, 70, 6, 16, 3) : x.rect(-3 + rel * 40, 70, 6, 16); x.fill();
      // the glass: nearly clear, darker where it turns away (seen through more of it), one long highlight and a smaller one
      var gl = x.createLinearGradient(-55, 0, 55, 0); gl.addColorStop(0, 'rgba(' + INK + ',.16)'); gl.addColorStop(.18, 'rgba(255,255,255,.22)'); gl.addColorStop(.5, 'rgba(255,255,255,.08)'); gl.addColorStop(.85, 'rgba(255,255,255,.14)'); gl.addColorStop(1, 'rgba(' + INK + ',.2)');
      bellPath(x); x.fillStyle = gl; x.fill();
      paint(true);
      x.restore();
      x.lineCap = 'round';
      x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 4; x.beginPath(); x.moveTo(-33, 24); x.quadraticCurveTo(-43, 46, -41, 72); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(-31, 26); x.quadraticCurveTo(-40, 46, -38, 70); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(26, 16); x.quadraticCurveTo(36, 26, 40, 40); x.stroke();
      bellPath(x); x.strokeStyle = 'rgba(' + INK + ',.3)'; x.lineWidth = 1.1; x.stroke();
      // the rim, left rough
      x.beginPath(); for (var r = 0; r <= 40; r++) { var rx = -53 + r * 106 / 40, ry = 86 + RIM[r]; r ? x.lineTo(rx, ry) : x.moveTo(rx, ry); }
      x.strokeStyle = 'rgba(' + INK + ',.42)'; x.lineWidth = 1.4; x.stroke(); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = .8; x.translate(0, -1.4); x.stroke();
      x.fillStyle = 'rgb(' + INK + ')'; x.beginPath(); x.arc(0, 3, 3.2, 0, TAU); x.fill();
      x.restore();
    }
    function loop(now) {
      if (!vis) { raf = 0; return; }
      var dt = clamp((now - (last || now)) / 1000, 0, .04); last = now; t += dt; step(dt); draw(); raf = requestAnimationFrame(loop);
    }
    if (opt.reduce) { draw(); }
    else new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis && !raf) { last = 0; raf = requestAnimationFrame(loop); } }, { rootMargin: '100px 0px' }).observe(cv);
    return { draw: draw, ring: function (s) { S.vs += (Math.random() < .5 ? -1 : 1) * 3.4; ring(!!s); if (opt.reduce) draw(); } };
  };
})();
