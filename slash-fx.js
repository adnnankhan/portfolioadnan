/* The slash, around the GPU cut (slash-gl.js), in three layers of the hero:
     .sl-gl     the cuts and the world behind them (under the words)
     .sl-leaf   the far and middle leaves, their shadows, and the wind drawn on the paper (under the words)
     .sl-trail  the blade's passing, the aim line while you drag, and the few near leaves that pass in front (over the words)
   A strike is one movement of the blade, as in iai: it comes in accelerating (before the paper), crosses the paper at full
   speed (the cut is only there, dead straight), and follows through, slowing to a stop. Where it crossed, the paper is first
   only scratched; it parts right behind the blade (your cuts), or all at once a moment later (the opener's Z: three strikes,
   then stillness, then the paper gives).
   The leaves: three depths, each falling like a leaf does (swinging side to side, gliding at the ends of a swing, tumbling
   faster in a gust), all on one wind: a steady breeze from the right, eddies, and gust fronts that sweep across now and then.
   The pointer's movement is a gust too, and a blade through a leaf cuts it in two.
   Slash(host, world, clock, { onCut, guide }) -> { ok, z(t0) -> release time, arm(), leaves(on) } ; clock() in seconds */
(function () {
  var CFG = {
    moon: { seam: 1.6 }, ember: { seam: 2.4 }, world: { seam: 1.6 }, gold: { seam: 4.5 },
    wind: { seam: 1.4, mode: 1 }, storm: { seam: 1.4 }, ink: { seam: 2.8 }
  };
  var TAU = Math.PI * 2;
  function seeded(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- the leaf: a maple leaf, five pointed lobes with toothed edges, veins and a stem; its back paler ----------
  function leafSprite(c0, c1, back, blur) {
    var S = 112, cv = document.createElement('canvas'); cv.width = cv.height = S; var x = cv.getContext('2d');
    if (blur) x.filter = 'blur(' + blur + 'px)';
    x.translate(S / 2, S / 2 + 6);
    var lobes = [[-Math.PI / 2, 1], [-Math.PI / 2 - .95, .92], [-Math.PI / 2 + .95, .92], [-Math.PI / 2 - 1.95, .58], [-Math.PI / 2 + 1.95, .58]];
    x.beginPath();
    for (var i = 0; i <= 240; i++) { var a = -Math.PI / 2 + i / 240 * TAU, r = .2;
      lobes.forEach(function (l) { var d = Math.cos(a - l[0]); if (d > 0) r = Math.max(r, l[1] * Math.pow(d, 3.2)); });
      r = r * (1 - (r > .4 ? .07 * Math.pow(Math.abs(Math.sin(a * 13)), 3) : 0)) * 46;
      var px = Math.cos(a) * r, py = Math.sin(a) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath();
    var g = x.createRadialGradient(0, -4, 2, 0, -8, 48); g.addColorStop(0, back ? c1 : c0); g.addColorStop(1, back ? c0 : c1);
    x.fillStyle = g; x.fill();
    if (!blur) {
      x.save(); x.clip();
      for (var k = 0; k < 260; k++) { x.fillStyle = 'rgba(' + (k % 2 ? '255,210,160,' : '60,10,4,') + (Math.random() * .08).toFixed(3) + ')'; x.beginPath(); x.arc((Math.random() - .5) * 90, (Math.random() - .6) * 90, Math.random() * 2.2, 0, TAU); x.fill(); }
      x.strokeStyle = back ? 'rgba(255,230,205,.5)' : 'rgba(255,200,150,.4)'; x.lineCap = 'round';
      lobes.forEach(function (l) { x.lineWidth = 1.6; x.beginPath(); x.moveTo(0, 4); x.lineTo(Math.cos(l[0]) * l[1] * 42, Math.sin(l[0]) * l[1] * 42); x.stroke();
        x.lineWidth = .8; for (var j = 1; j < 4; j++) { var t = j / 4.2, bx = Math.cos(l[0]) * l[1] * 42 * t, by = Math.sin(l[0]) * l[1] * 42 * t + 4 * (1 - t);
          [-.6, .6].forEach(function (o) { x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.cos(l[0] + o) * 9 * (1.2 - t), by + Math.sin(l[0] + o) * 9 * (1.2 - t)); x.stroke(); }); } });
      x.restore();
      x.lineWidth = 1; x.strokeStyle = 'rgba(70,14,5,.35)'; x.stroke();
    }
    x.strokeStyle = back ? c1 : 'rgba(90,30,14,.9)'; x.lineWidth = 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 6); x.quadraticCurveTo(3, 30, 9, 44); x.stroke();
    return cv;
  }
  function shadowSprite(src) {
    var cv = document.createElement('canvas'); cv.width = cv.height = src.width; var x = cv.getContext('2d');
    x.filter = 'blur(4px) brightness(0)'; x.drawImage(src, 0, 0); return cv;
  }
  // autumn, not one red: crimson, scarlet, persimmon, the ochre of fallen leaves, golden brown, a late yellow
  var COLS = [['#D2452A', '#8E1A10'], ['#C8321F', '#7A140C'], ['#DB6A2E', '#9C3814'], ['#D57835', '#9A4A18'], ['#C66B27', '#7E3F12'], ['#E0A040', '#A5651A']];
  var SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = COLS.map(function (c) { var f = leafSprite(c[0], c[1]); return { f: f, b: leafSprite(c[0], c[1], true), s: shadowSprite(f), bl: leafSprite(c[0], c[1], false, 3), bb: leafSprite(c[0], c[1], true, 3) }; });
    return SPR;
  }
  window.Slash = function (host, kind, clock, opt) {
    opt = opt || {};
    var cfg = CFG[kind] || CFG.wind;
    function layer(cls) { var c = document.createElement('canvas'); c.className = cls; c.setAttribute('aria-hidden', 'true'); host.appendChild(c); return c; }
    var gcv = layer('sl-gl'), lcv = layer('sl-leaf'), tcv = layer('sl-trail');
    // one world for the day, another for the night, on the same canvas (each compiled when first needed)
    var Gs = {}, G;
    function world(k) { if (!Gs[k]) { try { Gs[k] = window.SlashGL ? SlashGL(gcv, k) : { ok: false }; } catch (e) { console.error(e); Gs[k] = { ok: false }; } if (W && Gs[k].ok) Gs[k].size(W, H, DPR * (W * H > 1.7e6 ? .75 : 1)); } return Gs[k]; }
    G = world(kind);
    // the paper's ink: by day, sumi on washi; at night the paper is dark and what is drawn on it is light
    var INK = '39,34,31', PAPER = { ink: [.15, .13, .12], lip: [1, .99, .96], shade: [.55, .5, .45] };
    var lx = lcv.getContext('2d'), tx = tcv.getContext('2d'), W = 0, H = 0, DPR = 1, phone = false;
    function size() {
      W = host.clientWidth; H = host.clientHeight; phone = W < 760; DPR = Math.min(2, devicePixelRatio || 1);
      for (var k in Gs) if (Gs[k].ok) Gs[k].size(W, H, DPR * (W * H > 1.7e6 ? .75 : 1));
      [[lcv, lx], [tcv, tx]].forEach(function (p) { p[0].width = W * DPR; p[0].height = H * DPR; p[0].style.width = W + 'px'; p[0].style.height = H + 'px'; p[1].setTransform(DPR, 0, 0, DPR, 0, 0); });
    }
    size(); addEventListener('resize', size);

    // ---------- cuts and swings ----------
    var cuts = [], strikes = [], armed = false, cutCount = 0;
    function addCut(c) { c.mode = cfg.mode || 0; c.seam = cfg.seam; c.end = c.heal + .75 + c.seam + .4; if (cuts.length >= (G.N || 10)) { cuts.sort(function (p, q) { return p.t0 - q.t0; }); cuts.shift(); } cuts.push(c); return c; }
    // A swing, the way a sword is swung: it turns about the hands (H), so the blade sweeps round and its tip runs on an arc of
    // radius R (the sword's length from the hands). It comes in turning faster, crosses the paper at full speed, and follows
    // through, slowing. The cut is the straight line where the turning blade crossed the paper, from a to b. (show: false
    // draws only the blade's light, not the sword: your cuts, after the opener)
    //   a, b    where the cut starts and ends (on the tip's arc); side: which side of the line the hands are (+1 or -1 of its
    //           normal)
    function swing(a, b, t0, o) {
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, R = Math.max(o.R || W * 1.1, L * .62), d = Math.sqrt(Math.max(R * R - L * L / 4, 1));
      var nx = -dy / L * (o.side || 1), ny = dx / L * (o.side || 1), H = [(a[0] + b[0]) / 2 + nx * d, (a[1] + b[1]) / 2 + ny * d];
      var ta = Math.atan2(a[1] - H[1], a[0] - H[0]), tb = Math.atan2(b[1] - H[1], b[0] - H[0]), D = tb - ta;
      while (D > Math.PI) D -= 2 * Math.PI; while (D < -Math.PI) D += 2 * Math.PI;
      var v = o.v || 8000, T = R * Math.abs(D) / v, T1 = o.T1 || .07, T2 = o.T2 || .13, pre = D * .28, post = D * .34;
      var s = { a: a, b: b, H: H, R: R, ta: ta, D: D, pre: pre, post: post, t0: t0, T1: T1, T: T, T2: T2, flip: D > 0 ? 1 : -1, end: t0 + T1 + T + T2, fade: .09, done: false };
      strikes.push(s);
      // the opener's cuts are straight (the line where the turning blade crossed the paper, a to b); yours follow the
      // blade's arc (arc: true)
      s.cut = addCut(o.arc ? { h: H, r: R * .955, th0: ta, D: D, t0: t0 + T1, dur: T, w: o.w, open: o.open || 0, heal: o.heal } : { a: a, b: b, t0: t0 + T1, dur: T, w: o.w, open: o.open || 0, heal: o.heal });
      s.show = o.show !== false;
      return s;
    }
    // the blade's angle at time t: easing in (as if from a wind-up), steady through the cut, easing out on the follow-through
    function angle(s, t) {
      var e = t - s.t0;
      if (e < s.T1) { var k = e / s.T1; return s.ta - s.pre * (1 - k) * (1 - k); }
      e -= s.T1; if (e < s.T) return s.ta + s.D * e / s.T;
      e -= s.T; var k2 = Math.min(1, e / s.T2); return s.ta + s.D + s.post * (1 - (1 - k2) * (1 - k2));
    }

    // the opener's Z: across the top (yoko), down the diagonal (kesa), across the bottom, each a swing of the one sword, a
    // breath between; stillness; then the paper gives, all at once
    // three separate cuts, each from one edge of the screen to the other, spread over the whole of it (they cross; none
    // starts where the last ended): across the top just under the nav, left to right; corner to corner, from the top right
    // down to the bottom left; across the bottom, left to right. The whole screen looks cut, and the hero comes out of it
    function zcuts() {
      var e = 12, c = phone ? [[-e, .17, 1, .12], [1, .1, -e, .92], [-e, .9, 1, .85]] : [[-e, .19, 1, .12], [1, .08, -e, .95], [-e, .92, 1, .85]];
      return c.map(function (q) { return [[q[0] < 0 ? q[0] : q[0] * W + e, q[1] * H], [q[2] < 0 ? q[2] : q[2] * W + e, q[3] * H]]; });
    }
    var releaseT = -9, releasePts = null;
    function z(t0) {
      var p = zcuts(), w = phone ? 4 : clamp(W * .0042, 4.5, 6.5), R = phone ? W * 1.45 : W * 1.45, t = t0, last;
      // the hands below the first two cuts (the second from the lower right), above the last (so it bows away from the words)
      [1, -1, -1].forEach(function (side, i) { last = swing(p[i][0], p[i][1], t, { R: R, side: side, v: phone ? 7000 : 10000, w: w, open: 0, heal: 0 }); t = last.end + .07; });
      var rel = t + .32, heal = rel + 3.1;
      cuts.forEach(function (c) { if (c.t0 >= t0 - .01 && !c.open) { c.open = rel; c.heal = heal; c.end = heal + .75 + c.seam + .4; } });
      releaseT = rel; releasePts = p;
      return rel;
    }
    // where the sword is now, if a swing is under way: its hands, length, angle, which way its edge faces, how visible
    function blade(t) {
      for (var i = strikes.length - 1; i >= 0; i--) { var s = strikes[i]; if (!s.show || t < s.t0 || t > s.end + s.fade) continue;
        return { H: s.H, R: s.R, th: angle(s, t), flip: s.flip, a: Math.min(1, (t - s.t0) / .04) * (1 - clamp((t - s.end) / s.fade, 0, 1)), sp: t > s.t0 + s.T1 && t < s.t0 + s.T1 + s.T ? 1 : 0 }; }
      return null;
    }

    // ---------- you cut: press, drag to aim, let go; the blade strikes along the line ----------
    var drag = null, ptr = { x: -1e3, y: -1e3, t: -9, vx: 0, vy: 0, on: false }, hist = [], par = [0, 0];
    function rel(e) { var r = host.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function interactive(e) { return e.target.closest && e.target.closest('a, button, input, [role="slider"]'); }
    host.addEventListener('pointerdown', function (e) {
      hist.length = 0; if (!armed || interactive(e) || e.button > 0) return;
      var p = rel(e); drag = { a: p, b: p, id: e.pointerId }; host.classList.add('aiming');
    });
    host.addEventListener('pointermove', function (e) {
      var t = clock(), p = rel(e);
      hist.push({ x: p[0], y: p[1], t: t }); while (hist.length > 2 && t - hist[0].t > .08) hist.shift();
      var h0 = hist[0], dt = t - h0.t; ptr.x = p[0]; ptr.y = p[1]; ptr.on = true;
      if (dt > .008) { ptr.vx = (p[0] - h0.x) / dt; ptr.vy = (p[1] - h0.y) / dt; ptr.t = t; }
      if (drag && e.pointerId === drag.id) drag.b = p;
    }, { passive: true });
    function release(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null; host.classList.remove('aiming');
      if (e.type === 'pointercancel') return;
      var L = Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]); if (L < 48) return;
      var t = clock();
      // the paper is simply cut along your line, straight (nothing sweeps across: no sword, no blade's light)
      addCut({ a: d.a, b: d.b, t0: t, dur: .01, w: phone ? 3.5 : clamp(L * .004, 3.5, 5.5), heal: t + 1.9 });
      cutCount++; if (opt.onCut) opt.onCut(cutCount);
    }
    addEventListener('pointerup', release); addEventListener('pointercancel', release);

    // ---------- the wind: one field for the leaves, the wind drawn on the paper, and the gust fronts ----------
    var rnd = seeded(11), gusts = [], nextGust = 4;
    function windAt(x, y, t) {
      var wx = -34 - 14 * Math.sin(t * .5 + y * .004), wy = 7 + 9 * Math.cos(t * .7 + x * .005);
      for (var i = 0; i < gusts.length; i++) { var g = gusts[i], gx = g.x0 - g.v * (t - g.t), d = (x - gx) / g.w, f = Math.exp(-d * d) * g.a; wx -= f * 170; wy += f * 26 * Math.sin(y * .01 + g.t); }
      return [wx, wy];
    }
    // the wind drawn on the paper: fine strokes riding the field, faster than the leaves
    var streaks = [];
    function newStreak(x, y, guide) { return { p: [[x, y]], x: x, y: y, life: 0, max: guide ? 3.4 : 1.6 + rnd() * 1.6, sp: 2.2 + rnd() * 1.2, guide: !!guide, ang: rnd() * TAU }; }
    function stepStreaks(t, dt) {
      var target = opt.guide && streaks.some(function (q) { return q.guide; }) ? opt.guide() : null;
      for (var i = streaks.length - 1; i >= 0; i--) { var s = streaks[i], w = windAt(s.x, s.y, t), vx = w[0] * s.sp, vy = w[1] * s.sp * .6;
        if (s.guide && target) { var gx = target[0] - s.x, gy = target[1] - s.y, gd = Math.hypot(gx, gy) || 1;
          if (gd > 110 && !s.circling) { vx = vx * .3 + gx / gd * 300; vy = vy * .3 + gy / gd * 300; }
          else { s.circling = true; s.ang -= dt * 3.4; vx = (target[0] + Math.cos(s.ang) * 130 - s.x) * 5; vy = (target[1] + Math.sin(s.ang) * 40 - s.y) * 5; } }
        s.x += vx * dt; s.y += vy * dt; s.life += dt; s.p.push([s.x, s.y]); if (s.p.length > 22) s.p.shift();
        if (s.life > s.max || s.x < -60 || s.y > H + 60 || s.y < -60) streaks.splice(i, 1); }
      var want = (phone ? 2 : 5) + (gusts.length ? (phone ? 3 : 6) : 0);
      if (!clock.frozen && streaks.length < want && rnd() < dt * 6) streaks.push(newStreak(W + 20, rnd() * H * .95));
    }
    function drawStreaks(a) {
      lx.lineCap = 'round';
      streaks.forEach(function (s) { var n = s.p.length; if (n < 3) return; var f = Math.min(1, s.life / .3) * Math.min(1, (s.max - s.life) / .5) * a;
        // in three runs, fading in toward the head (one path each, not one per point)
        for (var r = 0; r < 3; r++) { var j0 = Math.floor((n - 1) * r / 3), j1 = Math.floor((n - 1) * (r + 1) / 3) + 1, k = (r + 1) / 3;
          lx.strokeStyle = 'rgba(' + INK + ',' + ((s.guide ? .2 : .13) * k * f).toFixed(3) + ')'; lx.lineWidth = .6 + k * .7; lx.beginPath(); lx.moveTo(s.p[j0][0], s.p[j0][1]);
          for (var j = j0 + 1; j < Math.min(j1, n); j++) lx.lineTo(s.p[j][0], s.p[j][1]); lx.stroke(); } });
    }
    // a guiding gust: the wind gathers and goes to the place to look next (the way the game's wind shows the way)
    function guideGust() { for (var i = 0; i < 6; i++) streaks.push(newStreak(W + 20 + i * 36, H * (.3 + .4 * rnd()), true)); }

    // ---------- the leaves ----------
    var leaves = [], leavesOn = 0, leavesT = 0;
    var DEPTH = [{ n: 9, np: 4, s: [13, 20], k: .5, fall: [12, 20], a: .55 }, { n: 8, np: 5, s: [26, 40], k: 1, fall: [22, 34], a: 1 }, { n: 2, np: 1, s: [64, 92], k: 1.7, fall: [46, 64], a: .9 }];
    function newLeaf(d, init) {
      var D = DEPTH[d], s = D.s[0] + rnd() * (D.s[1] - D.s[0]), top = rnd() < .45;
      var x = init ? rnd() * W * 1.1 : top ? rnd() * W * 1.25 : W + s + rnd() * 80, y = init ? rnd() * H : top ? -s - rnd() * 60 : rnd() * H * .7;
      return { d: d, x: x, y: y, vx: -30, vy: 10, r0: rnd() * TAU, vr: (rnd() - .5) * .9, ph: rnd() * TAU, vp: .9 + rnd() * 1.6, sw: rnd() * TAU, sws: 1.6 + rnd() * 1.4, amp: 18 + rnd() * 26,
        fall: D.fall[0] + rnd() * (D.fall[1] - D.fall[0]), s: s * (phone ? .85 : 1), k: rnd() * COLS.length | 0, h: d === 2 ? 0 : (d ? 9 : 4) + rnd() * 8, clip: null, life: 0 };
    }
    function leavesInit() { leaves = []; DEPTH.forEach(function (D, d) { for (var i = 0; i < (phone ? D.np : D.n); i++) if (d < 2 || clock.frozen) leaves.push(newLeaf(d, true)); }); }
    function cutLeaf(l, a, b) {
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      var k = clamp((l.x - a[0]) * ux + (l.y - a[1]) * uy, 0, L), px = a[0] + ux * k - l.x, py = a[1] + uy * k - l.y, r = l.r0 + Math.sin(l.sw) * .5;
      var cr = Math.cos(r), sr = Math.sin(r), sx = Math.max(Math.abs(Math.cos(l.ph)), .08);
      var vx = (px * cr + py * sr) / sx, vy = -px * sr + py * cr, nx0 = -uy, ny0 = ux;
      var nx = (nx0 * cr + ny0 * sr) * sx, ny = -nx0 * sr + ny0 * cr, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      leaves.splice(leaves.indexOf(l), 1);
      [1, -1].forEach(function (s) {
        var q = {}; for (var key in l) q[key] = l[key];
        q.vx = l.vx + nx0 * s * 90 + ux * 140; q.vy = l.vy + ny0 * s * 90 + uy * 140; q.vr = l.vr + s * 3; q.vp = l.vp * .4; q.clip = { x: vx, y: vy, nx: nx * s, ny: ny * s }; q.life = 0;
        leaves.push(q);
      });
    }
    function stepLeaves(t, dt) {
      var gustP = ptr.on && t - ptr.t < .1;
      for (var i = leaves.length - 1; i >= 0; i--) { var l = leaves[i], D = DEPTH[l.d], w = windAt(l.x, l.y, t);
        if (gustP) { var d = Math.hypot(l.x - ptr.x, l.y - ptr.y), R = 200 * D.k; if (d < R) { var f = Math.pow(1 - d / R, 2) * dt * 1.5; l.vx += clamp(ptr.vx, -3000, 3000) * f * .5; l.vy += clamp(ptr.vy, -3000, 3000) * f * .5; l.vr += (ptr.vx > 0 ? 1 : -1) * f * 3; l.vp += f * 3; } }
        if (l.clip) { l.life += dt; l.vy += 190 * dt; l.vx *= 1 - .7 * dt; }
        else {
          // the swing of a falling leaf: side to side, gliding at the ends of each swing, dropping through the middle
          l.sw += l.sws * dt; var m = Math.min(1, dt * 1.3);
          var tx2 = w[0] * D.k + Math.cos(l.sw) * l.amp * D.k, ty2 = l.fall * (.45 + .9 * Math.abs(Math.cos(l.sw))) * D.k + w[1] * D.k;
          l.vx += (tx2 - l.vx) * m; l.vy += (ty2 - l.vy) * m;
          l.vp += (1 + 3 * Math.max(0, -w[0] - 40) / 170 - l.vp) * m * .4; l.r0 += l.vr * dt; l.vr *= 1 - .25 * dt;
        }
        l.x += l.vx * dt; l.y += l.vy * dt; l.ph += l.vp * dt;
        if (l.x < -120 || l.y > H + 120 || l.x > W + 400 || l.y < -400 || l.life > 1.9) { leaves.splice(i, 1); if (!l.clip) leaves.push(newLeaf(l.d, false)); }
      }
      var near = leaves.filter(function (q) { return q.d === 2 && !q.clip; }).length;
      if (!clock.frozen && near < (phone ? DEPTH[2].np : DEPTH[2].n) && rnd() < dt * .12) leaves.push(newLeaf(2, false));
    }
    function drawLeaf(cx, l, a) {
      var sx = Math.cos(l.ph), S = SPR[l.k], al = a * DEPTH[l.d].a * (l.clip ? 1 - clamp((l.life - 1) / .9, 0, 1) : 1), sc = l.s / 112, r = l.r0 + Math.sin(l.sw) * .5;
      var o = l.d === 2 ? [par[0] * -1.6, par[1] * -1.6] : l.d === 0 ? [par[0] * .3, par[1] * .3] : [0, 0];
      for (var pass = l.h && !phone ? 0 : 1; pass < 2; pass++) {
        cx.save(); cx.translate(l.x + o[0] + (pass ? 0 : l.h * .6), l.y + o[1] + (pass ? 0 : l.h)); cx.rotate(r); cx.scale(Math.max(Math.abs(sx), .06) * sc, sc);
        if (l.clip) { var c = l.clip, a2 = -c.ny * 400, b2 = c.nx * 400; cx.beginPath(); cx.moveTo((c.x + a2) / sc, (c.y + b2) / sc); cx.lineTo((c.x - a2) / sc, (c.y - b2) / sc);
          cx.lineTo((c.x - a2 + c.nx * 400) / sc, (c.y - b2 + c.ny * 400) / sc); cx.lineTo((c.x + a2 + c.nx * 400) / sc, (c.y + b2 + c.ny * 400) / sc); cx.closePath(); cx.clip(); }
        cx.globalAlpha = pass ? al : al * .12;
        cx.drawImage(pass ? (l.d === 1 ? (sx >= 0 ? S.f : S.b) : (sx >= 0 ? S.bl : S.bb)) : S.s, -56, -62); cx.restore();
      }
    }

    // ---------- drawing the blade's passing ----------
    // the smear: ink-dark air behind the blade's edge, thin at the tail, full near the edge, a point at the very tip; the
    // edge itself a hairline, with a short glint of steel at the tip while it moves
    // the swing's smear: the band of air the blade has just swept (from near the guard out to the tip), thickest behind the
    // blade and fading back; along its outer edge, the line the tip draws, bright near the tip
    function drawStrike(s, t) {
      if (t > s.end + s.fade) return;
      var th = angle(s, t), tb = angle(s, Math.max(s.t0, t - .05)), dir = s.D > 0 ? 1 : -1, a = Math.min(1, (t - s.t0) / .04) * (1 - clamp((t - s.end) / s.fade, 0, 1));
      if (Math.abs(th - tb) < .002) return;
      var r0 = s.R - Math.min(s.R * .12, 110), r1 = s.R * 1.005, H = s.H, lo = dir > 0 ? tb : th, hi = dir > 0 ? th : tb;
      tx.save(); tx.globalAlpha = a;
      tx.beginPath(); tx.arc(H[0], H[1], r1, lo, hi); tx.arc(H[0], H[1], r0, hi, lo, true); tx.closePath();
      if (tx.createConicGradient) { var g = tx.createConicGradient(lo, H[0], H[1]), span = (hi - lo) / (2 * Math.PI);
        if (dir > 0) { g.addColorStop(0, 'rgba(' + INK + ',0)'); g.addColorStop(span, 'rgba(' + INK + ',.1)'); g.addColorStop(Math.min(1, span + .001), 'rgba(' + INK + ',0)'); }
        else { g.addColorStop(0, 'rgba(' + INK + ',.1)'); g.addColorStop(span, 'rgba(' + INK + ',0)'); }
        tx.fillStyle = g; } else tx.fillStyle = 'rgba(' + INK + ',.08)';
      tx.fill();
      // the tip's line
      tx.lineCap = 'round';
      for (var k = 0; k < 8; k++) { var u0 = tb + (th - tb) * k / 8, u1 = tb + (th - tb) * (k + 1) / 8, e = (k + 1) / 8;
        tx.strokeStyle = 'rgba(255,250,238,' + (.85 * e * e).toFixed(3) + ')'; tx.lineWidth = .8 + 1.6 * e; tx.beginPath(); tx.arc(H[0], H[1], r1 * .985, Math.min(u0, u1), Math.max(u0, u1)); tx.stroke(); }
      tx.restore();
    }
    // while you drag: a dotted line from where you pressed, darker once it is long enough to cut, a ring at the blade's end
    function drawAim() {
      if (!drag) return; var a = drag.a, b = drag.b, L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 6) return;
      tx.save(); tx.setLineDash([2, 6]); tx.lineCap = 'round'; tx.strokeStyle = 'rgba(' + INK + ',' + (L < 48 ? .25 : .55) + ')'; tx.lineWidth = 1.2;
      tx.beginPath(); tx.moveTo(a[0], a[1]); tx.lineTo(b[0], b[1]); tx.stroke(); tx.setLineDash([]);
      tx.fillStyle = 'rgba(' + INK + ',.55)'; tx.beginPath(); tx.arc(a[0], a[1], 2.4, 0, TAU); tx.fill();
      tx.strokeStyle = 'rgba(152,86,41,.9)'; tx.lineWidth = 1.4; tx.beginPath(); tx.arc(b[0], b[1], 6, 0, TAU); tx.stroke(); tx.restore();
    }

    // ---------- one loop ----------
    var last = clock(), vis = true, glOn = false, guided = false, idle = 0, burst = false;
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) requestAnimationFrame(tick); }).observe(host);
    function tick() {
      if (!vis) return;
      var t = clock(), dt = clamp(t - last, 0, .05); last = t;
      if (!SPR) { sprites(); leavesInit(); }
      // gust fronts, now and then
      if (t > nextGust && !clock.frozen) { gusts.push({ t: t, x0: W * 1.35, v: W * .55, w: W * .2, a: .6 + rnd() * .5 }); nextGust = t + 6 + rnd() * 4; }
      gusts = gusts.filter(function (g) { return g.x0 - g.v * (t - g.t) > -W * .4; });
      // the blade, passing a leaf, cuts it
      strikes.forEach(function (s) { if (s.done || t < s.t0) return; if (t > s.end) { s.done = true; return; }
        var th = angle(s, t), tp = s.lastTh == null ? th : s.lastTh; s.lastTh = th;
        leaves.slice().forEach(function (l) { if (l.clip || leavesOn < .5) return; var r = Math.hypot(l.x - s.H[0], l.y - s.H[1]); if (r < s.R * .35 || r > s.R * 1.02) return;
          var la = Math.atan2(l.y - s.H[1], l.x - s.H[0]), lo = Math.min(th, tp) - .02, hi = Math.max(th, tp) + .02, d0 = la - lo; while (d0 < 0) d0 += 2 * Math.PI; while (d0 > 2 * Math.PI) d0 -= 2 * Math.PI;
          if (d0 <= hi - lo) { var c = Math.cos(la), sn = Math.sin(la); cutLeaf(l, [s.H[0] + c * s.R * .3, s.H[1] + sn * s.R * .3], [s.H[0] + c * s.R, s.H[1] + sn * s.R]); } }); });
      // the Z gives: wind comes out of the cuts, and a gust throws the leaves
      if (!burst && releasePts && t >= releaseT && !clock.frozen) { burst = true;
        for (var i = 0; i < 3; i++) for (var j = 0; j < 4; j++) { var k = (j + .5) / 4, A = releasePts[i][0], B = releasePts[i][1]; streaks.push(newStreak(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k)); }
        gusts.push({ t: t, x0: W * .9, v: W * .7, w: W * .25, a: .7 }); }
      leavesOn = clamp(leavesOn + (leavesT ? dt : -dt) / 1.2, 0, 1);
      // once you can cut, the wind shows the way to the work, and again after a while of stillness
      if (armed && !clock.frozen) { idle = ptr.on && t - ptr.t < .5 ? 0 : idle + dt; if (!guided || idle > 12) { guided = true; idle = 0; if (opt.guide) guideGust(); } }
      stepLeaves(t, dt); stepStreaks(t, dt);
      lx.clearRect(0, 0, W, H); tx.clearRect(0, 0, W, H);
      if (leavesOn > 0) { drawStreaks(leavesOn); leaves.forEach(function (l) { if (l.d < 2) drawLeaf(lx, l, leavesOn); }); }
      strikes = strikes.filter(function (s) { return t < s.end + .2; });
      strikes.forEach(function (s) { if (t >= s.t0) drawStrike(s, t); });
      if (leavesOn > 0) leaves.forEach(function (l) { if (l.d === 2) drawLeaf(tx, l, leavesOn); });
      drawAim();
      var tp = ptr.on ? [-(ptr.x - W / 2) * .05, -(ptr.y - H / 2) * .05] : [0, 0]; par[0] += (tp[0] - par[0]) * .08; par[1] += (tp[1] - par[1]) * .08;
      cuts = cuts.filter(function (c) { return c.end > t; });
      if (G.ok) { if (cuts.length) { G.draw({ t: t, cuts: cuts, par: par, flash: 0, paper: PAPER }); glOn = true; } else if (glOn) { G.clear(); glOn = false; } }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return { ok: G.ok, z: z, blade: blade, arm: function () { armed = true; host.classList.add('armed'); }, leaves: function (on) { leavesT = on ? 1 : 0; if (clock.frozen) leavesOn = leavesT; },
      // day or night: the world behind the cut, and the ink the blade and the wind leave on the paper
      mode: function (k, night) { G = world(k); cfg = CFG[k] || cfg; cuts.forEach(function (c) { c.mode = cfg.mode || 0; }); glOn = true;
        INK = night ? '237,230,218' : '39,34,31'; PAPER = night ? { ink: [.86, .82, .75], lip: [.32, .29, .26], shade: [.05, .04, .035] } : { ink: [.15, .13, .12], lip: [1, .99, .96], shade: [.55, .5, .45] }; } };
  };

  // The same wind down the rest of the page, behind everything: a few leaves, far and middle only, on the breeze and its gusts.
  // Scrolling moves the air too (scroll down and they lift, as if you walked through them). It rests while the hero (which
  // has its own) fills the screen, and whenever the page is out of sight.
  window.Drift = function (cv, pause) {
    var x = cv.getContext('2d'), W = 0, H = 0, DPR = 1, rnd = seeded(29), leaves = [], gusts = [], nextGust = 3, t = 0, last = 0, sy = scrollY, air = 0, on = 0;
    function size() { W = innerWidth; H = innerHeight; DPR = Math.min(2, devicePixelRatio || 1); cv.width = W * DPR; cv.height = H * DPR; x.setTransform(DPR, 0, 0, DPR, 0, 0); }
    size(); addEventListener('resize', size);
    function leaf(init) {
      var d = rnd() < .45 ? 0 : 1, s = d ? 24 + rnd() * 14 : 12 + rnd() * 8, top = rnd() < .5;
      return { d: d, x: init ? rnd() * W : top ? rnd() * W * 1.2 : W + s, y: init ? rnd() * H : top ? -s - rnd() * 40 : rnd() * H * .7, vx: -24, vy: 10, r0: rnd() * TAU, vr: (rnd() - .5) * .8,
        ph: rnd() * TAU, vp: .9 + rnd() * 1.4, sw: rnd() * TAU, sws: 1.5 + rnd() * 1.3, amp: 16 + rnd() * 22, fall: d ? 20 + rnd() * 12 : 11 + rnd() * 7, s: s * (W < 760 ? .85 : 1), k: rnd() * COLS.length | 0 };
    }
    // (on phones, 30 frames a second is plenty for leaves this far back)
    function loop(now) {
      requestAnimationFrame(loop);
      if (W < 760 && last && now - last < 30) return;
      var dt = clamp((now - (last || now)) / 1000, 0, .05); last = now;
      var rest = pause() || document.hidden; on = clamp(on + (rest ? -dt : dt) / .8, 0, 1);
      if (!on) { if (W) x.clearRect(0, 0, W, H); return; }
      if (!leaves.length) { sprites(); for (var i = 0; i < (W < 760 ? 6 : 10); i++) leaves.push(leaf(true)); }
      t += dt; var ds = scrollY - sy; sy = scrollY; air += (clamp(-ds / Math.max(dt, .008), -900, 900) * .12 - air) * Math.min(1, dt * 4);
      if (t > nextGust) { gusts.push({ t: t, x0: W * 1.3, v: W * .5, w: W * .22, a: .5 + rnd() * .5 }); nextGust = t + 7 + rnd() * 5; }
      gusts = gusts.filter(function (g) { return g.x0 - g.v * (t - g.t) > -W * .4; });
      x.clearRect(0, 0, W, H);
      for (i = leaves.length - 1; i >= 0; i--) { var l = leaves[i], k = l.d ? 1 : .55, wx = -30 - 12 * Math.sin(t * .5 + l.y * .004), wy = 6 + 8 * Math.cos(t * .7 + l.x * .005);
        gusts.forEach(function (g) { var dd = (l.x - (g.x0 - g.v * (t - g.t))) / g.w; wx -= Math.exp(-dd * dd) * g.a * 160; });
        l.sw += l.sws * dt; var m = Math.min(1, dt * 1.3);
        l.vx += ((wx + Math.cos(l.sw) * l.amp) * k - l.vx) * m; l.vy += ((l.fall * (.45 + .9 * Math.abs(Math.cos(l.sw))) + wy) * k + air * k - l.vy) * m;
        l.x += l.vx * dt; l.y += l.vy * dt; l.ph += l.vp * dt; l.r0 += l.vr * dt;
        if (l.x < -80 || l.y > H + 80 || l.y < -300 || l.x > W + 300) { leaves[i] = leaf(false); if (air < -40) { leaves[i].y = H + 30; leaves[i].x = rnd() * W; } continue; }
        var S = SPR[l.k], sx = Math.cos(l.ph), sc = l.s / 112;
        x.save(); x.globalAlpha = on * (l.d ? .9 : .5); x.translate(l.x, l.y); x.rotate(l.r0 + Math.sin(l.sw) * .5); x.scale(Math.max(Math.abs(sx), .06) * sc, sc);
        x.drawImage(l.d ? (sx >= 0 ? S.f : S.b) : (sx >= 0 ? S.bl : S.bb), -56, -62); x.restore(); }
    }
    requestAnimationFrame(loop);
  };
})();
