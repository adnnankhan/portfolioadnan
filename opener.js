/* Opener: adnan.world arrives as a world. Three versions (?v=):
   planet  a small gridded globe spins in the middle, "adnan.world" rises under it; the camera dives in: the globe grows, tilts
           and slows until its edge is the hero's horizon, the word flies to its place in the nav, and the hero takes over.
   orbit   the same, with the hero's dotted sun path as a ring round the little globe and the sun going round it; on the dive the
           ring opens into the arc and the sun lands where it is now, at the real time in Kishanganj.
   light   no globe: a line of light draws the horizon out from the middle, the world brightens up from it, the word settles.
   The overlay copies the live hero canvas in as it goes, so the hand-over at the end is pixel for pixel. Any key, click, wheel
   or touch skips to the end. Reduced motion: no opener at all. */
(function () {
  var html = document.documentElement, V = (location.search.match(/[?&]v=(\w+)/) || [])[1] || 'planet';
  var AT = (location.search.match(/[?&]at=(\d+)/) || [])[1];   // ?at=ms holds one moment, for checking frames
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function finish() { html.classList.remove('opening', 'cover', 'nav-go', 'brand-hold'); }
  if (REDUCE || !html.classList.contains('opening')) { finish(); return; }

  var hero = document.querySelector('.hero'), hcv = hero && hero.querySelector('canvas'), brand = hero && hero.querySelector('.pl-brand');
  if (!hcv || !brand) { finish(); return; }
  var cv = document.createElement('canvas'), ctx = cv.getContext('2d'), DPR = Math.min(2, devicePixelRatio || 1), W = 0, H = 0;
  cv.id = 'opener'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
  function size() { W = innerWidth; H = innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  size(); addEventListener('resize', size);
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sm(a, b, t) { var k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }
  function inout(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ----- the hero's own geometry (the same formulas as hero/js/ground.js and sky.js) -----
  function geo() {
    var r = hcv.getBoundingClientRect(), w = r.width, h = r.height, nar = w < 760, f = Math.min(h * .9, w * (nar ? 1.1 : .7)), farY = h * (nar ? .63 : .7);
    var S = hero._S, G = S && S.G;
    return { x: r.left + w / 2, farY: r.top + farY, R: 30 * f / 10.5, nar: nar,
      arc: G ? { cx: r.left + G.cx, cy: r.top + G.cy, R: G.R, br: G.br } : null, sun: S && S.pos ? { x: r.left + S.pos.x, y: r.top + S.pos.y } : null, moon: S && S.mode === 'moon' };
  }

  // ----- the word: a copy of the nav's wordmark, letter by letter, flown from the middle to the nav (FLIP) -----
  var mark = document.createElement('div'); mark.id = 'opener-mark'; mark.setAttribute('aria-hidden', 'true');
  var bs = getComputedStyle(brand), wsp = brand.querySelector('span'), ws = wsp ? getComputedStyle(wsp) : bs;
  ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'color', 'paddingTop', 'paddingLeft'].forEach(function (k) { mark.style[k] = bs[k]; });
  var head = brand.firstChild && brand.firstChild.nodeType === 3 ? brand.firstChild.nodeValue : 'adnan', tail = wsp ? wsp.textContent : '.world', n = 0;
  function letters(t, st) { return t.split('').map(function (c) { return '<span class="ch" style="transition-delay:' + (n++ * 38) + 'ms">' + c + '</span>'; }).join(''); }
  mark.innerHTML = letters(head) + '<span class="w" style="color:' + ws.color + ';font-style:' + ws.fontStyle + ';font-family:' + ws.fontFamily + '">' + letters(tail) + '</span>';
  document.body.appendChild(mark);
  var BFS = parseFloat(bs.fontSize) || 20;
  function placeMark(e, introY) {
    var b = brand.getBoundingClientRect(), s0 = clamp(W * .045, 34, 64) / BFS, s = lerp(s0, 1, e), mw = mark.offsetWidth;
    var x0 = W / 2 - mw * s0 / 2, x = lerp(x0, b.left, e), y = lerp(introY, b.top, e);
    mark.style.left = '0px'; mark.style.top = '0px';
    mark.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
  }

  // ----- space: a deep sky and stars that stream past on the dive -----
  var stars = []; for (var i = 0; i < 220; i++) stars.push({ a: Math.random() * TAU, d: Math.sqrt(Math.random()), s: Math.random() * 1.1 + .3, tw: Math.random() * 6, al: Math.random() * .6 + .3 });
  function space(t, dive) {
    var g = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.hypot(W, H) * .6);
    g.addColorStop(0, '#0B1640'); g.addColorStop(.6, '#040922'); g.addColorStop(1, '#010210');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var M = Math.hypot(W, H) * .55, z = 1 + dive * dive * 2.6;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], d = s.d * M * z, x = W / 2 + Math.cos(s.a) * d, y = H * .45 + Math.sin(s.a) * d;
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      ctx.globalAlpha = s.al * (.65 + .35 * Math.sin(t / 700 + s.tw)) * sm(0, 380, t) * (1 - dive * .6);
      ctx.fillStyle = '#E4ECFF';
      if (dive > .05) { ctx.strokeStyle = '#E4ECFF'; ctx.lineWidth = s.s; ctx.beginPath(); ctx.moveTo(x, y); var tl = dive * dive * 26 * s.d; ctx.lineTo(x - Math.cos(s.a) * tl, y - Math.sin(s.a) * tl); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(x, y, s.s, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  // ----- the globe: the hero's ground as a whole sphere; lines of latitude and longitude, its rim glowing like the horizon -----
  function globe(cx, cy, r, tilt, spin, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    var g = ctx.createRadialGradient(cx - r * .3, cy - r * .55, r * .05, cx, cy, r);
    g.addColorStop(0, '#24419A'); g.addColorStop(.45, '#14204A'); g.addColorStop(1, '#060B20');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    // the grid, clipped to the disc; finer as the globe grows so it never breaks into polygons
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    var ct = Math.cos(tilt), st = Math.sin(tilt), step = Math.min(.07, 5 / r);
    function line(get, from, to, col) {
      ctx.strokeStyle = col; ctx.beginPath(); var on = false;
      for (var u = from; u <= to + 1e-9; u += step) {
        var q = get(u), cl = Math.cos(q[0]), x = cl * Math.sin(q[1] + spin), y = Math.sin(q[0]), z = cl * Math.cos(q[1] + spin), y2 = y * ct - z * st, z2 = y * st + z * ct;
        var sx = cx + x * r, sy = cy - y2 * r;
        if (z2 < 0 || sy > H + 40 || sy < -40 || sx < -40 || sx > W + 40) { on = false; continue; }
        if (on) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); on = true; }
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (var la = -75; la <= 68; la += 7.5) line(function (u) { return [la * Math.PI / 180, u]; }, 0, TAU, 'rgba(160,185,240,' + (.16 + .14 * (la + 90) / 180).toFixed(3) + ')');
    for (var lo = 0; lo < 360; lo += 10) line(function (u) { return [u, lo * Math.PI / 180]; }, -1.45, 1.45, 'rgba(195,193,244,.22)');
    ctx.restore();
    // the rim: a glow and a fine bright line, as on the hero's horizon
    ctx.shadowColor = 'rgba(140,170,255,0.8)'; ctx.shadowBlur = 22; ctx.strokeStyle = 'rgba(140,170,255,0.32)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(211,229,251,0.75)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  function sunDot(x, y, br, moon, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    var g = ctx.createRadialGradient(x, y, 0, x, y, br * 5); g.addColorStop(0, moon ? 'rgba(220,230,255,.5)' : 'rgba(255,240,200,.6)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, br * 5, 0, TAU); ctx.fill();
    ctx.fillStyle = moon ? '#E8EEFB' : '#FFF6DF'; ctx.beginPath(); ctx.arc(x, y, br, 0, TAU); ctx.fill(); ctx.restore();
  }
  // the dotted ring, as the hero draws its sun path; dots behind the globe are not drawn
  function ring(cx, cy, R, gx, gy, gr, hz, a) {
    if (a <= 0) return;
    var n = Math.max(24, Math.round(Math.PI * 2 * R / 9));
    ctx.save(); ctx.fillStyle = 'rgba(236,242,252,.5)';
    for (var i = 0; i < n; i++) {
      var th = TAU * i / n, x = cx + Math.cos(th) * R, y = cy - Math.sin(th) * R;
      if (Math.hypot(x - gx, y - gy) < gr || y > hz) continue;
      ctx.globalAlpha = a * .8; ctx.beginPath(); ctx.arc(x, y, 1.15, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ----- the clock -----
  var T = V === 'light' ? { pop: 200, hold: 900, dive: 1100, dur: 1500, fade: 2600 } : { pop: 250, hold: 1250, dive: 1300, dur: 1250, fade: 2550 };
  var t0 = performance.now(), skip = false, spin = 0, last = 0, done = false, intro = null, navGo = false;
  html.classList.add('brand-hold');
  function onSkip() { if (!skip && performance.now() - t0 < T.fade) { skip = true; t0 = performance.now() - T.fade + 1; } }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (e) { addEventListener(e, onSkip, { passive: true }); });

  function frame(now) {
    if (done) return;
    var t = AT ? +AT : now - t0, dt = AT ? 0 : last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    if (AT && !spin) spin = (Math.min(+AT, T.dive) / 1000) * .9;
    var G = geo(), k = inout(clamp((t - T.dive) / T.dur, 0, 1)), kl = clamp((t - T.dive) / T.dur, 0, 1);
    if (!navGo && t > T.dive) { navGo = true; html.classList.add('nav-go'); }
    // the word above, the world below it: on the dive the word rises to the nav and the world sinks into the horizon
    var r0 = Math.min(W, H) * (G.nar ? .2 : .15), c0y = H * (G.nar ? .56 : .58), s0 = clamp(W * .045, 34, 64) / BFS;
    if (!intro) intro = V === 'light' ? H * .38 : c0y - r0 * (V === 'orbit' ? 1.75 : 1) - (G.nar ? 30 : 40) - mark.offsetHeight * s0;   // in Orbit, above the ring
    if (!mark.classList.contains('in') && t > (V === 'light' ? T.pop : T.pop + 380)) mark.classList.add('in');
    // the shape settles a little before the dive ends, so the globe's edge is on the horizon before it hands over
    var kg = Math.min(1, k / .86);
    space(t, V === 'light' ? 0 : kl);
    // the live hero comes in over the last part of the dive
    var ha = V === 'light' ? 0 : sm(.42, .96, k);
    if (ha > 0) { ctx.globalAlpha = ha; ctx.drawImage(hcv, 0, 0, hcv.width, hcv.height, G.x - hcv.clientWidth / 2, G.farY - hcv.clientHeight * (G.nar ? .63 : .7), hcv.clientWidth, hcv.clientHeight); ctx.globalAlpha = 1; }
    if (V === 'light') light(t, G);
    else {
      var pop = sm(T.pop, T.pop + 650, t), w = 1 - Math.pow(1 - pop, 3);
      // spin: steady in the intro, slowing to a stop as it settles
      spin += dt * 0.9 * (1 - k);
      var r = r0 * Math.pow(G.R / r0, kg) * (.7 + .3 * w), top = lerp(c0y - r0, G.farY, kg), cy = top + r, tilt = lerp(.42, -.06, kg);
      if (V === 'orbit') {
        var A = G.arc, rr = r0 * 1.75 * (.7 + .3 * w), cx2 = A ? lerp(G.x, A.cx, kg) : G.x, cyR = A ? lerp(c0y, A.cy, kg) : c0y, RR = A ? rr * Math.pow(A.R / rr, kg) : rr;
        var hzY = k > .5 ? lerp(H * 4, G.farY, sm(.5, 1, k)) : H * 4;
        ring(cx2, cyR, RR, G.x, cy, r, hzY, w * (1 - sm(.85, 1, k)));
        // the sun goes round; on the dive it eases to where it really is now
        var th0 = t / 900, thT = A && G.sun ? Math.atan2(cyR - G.sun.y, G.sun.x - cx2) : Math.PI / 4, th = th0;
        if (k > 0) { var thS = (T.dive / 900); var target = thT; while (target < thS) target += TAU; th = lerp(thS, target, kg); }
        var sx = cx2 + Math.cos(th) * RR, sy = cyR - Math.sin(th) * RR, behind = Math.hypot(sx - G.x, sy - cy) < r && Math.sin(th) < 0;
        sunDot(sx, sy, A ? lerp(5, A.br, k) : 6, G.moon, w * (behind ? 0 : 1) * (1 - sm(.85, 1, k)));
      }
      globe(G.x, cy, r, tilt, spin, w * (1 - sm(.84, 1, k)));
    }
    placeMark(k, intro);
    if (t >= T.fade && !AT && !cv.classList.contains('out')) {
      // hand over: the overlay (now a copy of the hero) fades, the real word takes the copy's place, the headline comes in
      html.classList.remove('cover'); cv.classList.add('out'); html.classList.remove('brand-hold'); mark.remove();
      setTimeout(function () { html.classList.remove('opening', 'nav-go'); }, 60);
      setTimeout(function () { done = true; cv.remove(); try { sessionStorage.setItem('opened', '1'); } catch (e) {} }, 380);
    }
    requestAnimationFrame(frame);
  }
  // First light: the horizon draws out from the middle as a line of light, then the world brightens up from it
  var off = document.createElement('canvas'), octx = off.getContext('2d');
  function light(t, G) {
    var a = sm(T.pop, T.pop + 700, t), b = inout(clamp((t - T.dive) / T.dur, 0, 1));
    // the line: the hero's horizon curve, drawn outward from the middle
    var half = W / 2 * (1 - Math.pow(1 - a, 3));
    ctx.save(); ctx.shadowColor = 'rgba(140,170,255,0.9)'; ctx.shadowBlur = 18; ctx.strokeStyle = 'rgba(211,229,251,' + (.9 * (1 - b)).toFixed(3) + ')'; ctx.lineWidth = 1.6;
    ctx.beginPath(); for (var x = G.x - half; x <= G.x + half; x += 6) { var y = G.farY + (x - G.x) * (x - G.x) / (2 * G.R); if (x === G.x - half) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
    // the world, revealed from the horizon outward through a soft-edged ellipse
    if (b > 0) {
      off.width = cv.width; off.height = cv.height; octx.setTransform(DPR, 0, 0, DPR, 0, 0);
      octx.drawImage(hcv, 0, 0, hcv.width, hcv.height, G.x - hcv.clientWidth / 2, G.farY - hcv.clientHeight * (G.nar ? .63 : .7), hcv.clientWidth, hcv.clientHeight);
      octx.globalCompositeOperation = 'destination-in';
      var R = Math.hypot(W, H) * 1.1 * b + 1, gr = octx.createRadialGradient(G.x, G.farY, R * .55, G.x, G.farY, R);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      octx.save(); octx.translate(G.x, G.farY); octx.scale(1, .75); octx.translate(-G.x, -G.farY); octx.fillStyle = gr; octx.fillRect(-W, -H, W * 3, H * 3); octx.restore();
      octx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(off, 0, 0); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
  }
  requestAnimationFrame(frame);
})();
