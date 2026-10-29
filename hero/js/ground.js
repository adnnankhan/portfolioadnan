/* Ground: the curved, lined ground drawn in perspective, the four places on it (case study, prototype, essay, about)
   with their cards, the stars, and the hooks the sky uses. PLANET(name, desc, config) registers one hero with HX.

   World space: x across, z into the screen (ZN near .. ZF far), y up. The ground is a sphere of radius RAD seen from
   height camY, so rows bend down toward the sides and the horizon is a curve (env.hz(x) gives its screen y).
   The ground dips softly under the pointer (and under a place you are on); the dip makes a label "pop" when it reaches it.

   Config used by the sky (sky.js):
     stars, starC, sparkle      star count, colour, twinkle with crosses and the odd shooting star
     sky, ground                gradient stops (the sky rewrites these every frame)
     atmo                       [glow colour, haze stroke, rim stroke, blur] for the horizon line
     rowNear, rowFar, rowA      row line colours near/far and alpha [base, extra near]
     cols                       gradient for the lines running into the distance
     accent, dot                colours of a place's dot (active / idle)
     farY                       horizon height as a share of the hero height [wide screens, narrow screens]
     spots, spotsM              where the four places sit, as shares of width and height [wide, narrow]
     init(env)                  once, before the first layout
     pre(t, env)                every frame, before anything is drawn (move things, set colours)
     sky2(ctx, t, env)          every frame, after the stars and before the ground (sun, moon, path)
     ground2(ctx, t, env)       every frame, after the ground lines (light on the ground)
   env: { el, U, p (pointer), W, H, farY, narrow, starA (star alpha, set by the sky), hz(x), hzPts, busy } */
(function () {
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
  function grad(ctx, x0, y0, x1, y1, stops) { var g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }

  window.PLANET = function (name, desc, C) {
    HX.add(name, desc, function (el, U) {
      var cv = U.$('canvas', el), ctx = cv.getContext('2d'), labels = U.$$('.pl-proj', el), card = U.$('[data-card]', el), tpls = U.$$('template[data-tpl]', el);
      var RAD = 30, camY = 1.6, ZN = 1, ZF = 10.5, ZS = 0.26, XS = 0.42, XR = 9;
      var W = 0, H = 0, f = 600, hor = 300, narrow = false, farY = 0, STARS = [];
      var hole = { x: 0, z: 3, tx: 0, tz: 3, A: 0.42 }, M = [], waves = [], hover = -1, pinned = -1, pulse = 0, lsz = [], hideT = 0, overCard = false, lastLP = [], frz = null;
      var p = U.track(el), DEP = 0.9, SHOOT = null, nextShoot = 0;
      var env = { el: el, U: U, p: p, W: 0, H: 0, farY: 0, narrow: false, starA: 1 };

      // screen point -> ground point (x, z), solved iteratively because the ground is curved
      function toPlane(sx, sy, dep) {
        var d = Math.max(4, sy - hor), z = (camY + (dep || 0)) * f / d, x = 0;
        for (var k = 0; k < 6; k++) { x = (sx - W / 2) * z / f; z = U.clamp((camY + (dep || 0) + (x * x + z * z) / (2 * RAD)) * f / d, ZN + 0.4, ZF - 1.2); }
        return { x: (sx - W / 2) * z / f, z: z };
      }
      // ground point (x, z) at height y -> screen point
      function proj(x, z, y) { return [W / 2 + x / z * f, hor + (camY - y + (x * x + z * z) / (2 * RAD)) / z * f]; }
      // height of the ground at (x, z): the dip under the pointer, a small dip under each place, and the ripples from a tap
      function depthAt(x, z, t) {
        var dx = x - hole.x, dz = z - hole.z, y = -hole.A * 0.5 / (dx * dx + dz * dz + 0.5);
        for (var i = 0; i < M.length; i++) { var m = M[i], ex = x - m.x, ez = z - m.z; y -= m.A * 0.14 / (ex * ex + ez * ez + 0.14); }
        for (var k = 0; k < waves.length; k++) {
          var w = waves[k], age = (t - w.t0) / 1000, wx = x - w.x, wz = z - w.z, fr = Math.sqrt(wx * wx + wz * wz) - age * 3.2;
          y += 0.1 * Math.exp(-fr * fr / 0.6) * Math.exp(-age * 1.2) * Math.cos(fr * 4);
        }
        return y;
      }

      // ----- the places: hover or focus shows a card, click pins it -----
      function cur() { return pinned >= 0 ? pinned : hover; }
      function setHover(i) {
        clearTimeout(hideT); if (i === hover) return; hover = i;
        labels.forEach(function (l, k) { l.classList.toggle('on', k === cur()); l.setAttribute('aria-expanded', k === cur() ? 'true' : 'false'); });
        var c = cur(); frz = c >= 0 && lastLP[c] ? lastLP[c].slice() : null;
        if (c >= 0) { card.innerHTML = tpls[c].innerHTML; card.dataset.kind = tpls[c].dataset.kind || ''; card.hidden = false; } else if (card) card.hidden = true;
      }
      labels.forEach(function (l, i) {
        l.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') setHover(i); });
        l.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; hideT = setTimeout(function () { if (!overCard) setHover(-1); }, 240); });
        l.addEventListener('focus', function () { setHover(i); });
        l.addEventListener('blur', function () { hideT = setTimeout(function () { if (!overCard && !el.contains(document.activeElement)) setHover(-1); }, 240); });
        l.addEventListener('click', function () { pinned = pinned === i ? -1 : i; hover = -2; setHover(pinned); });
      });
      if (card) {
        card.addEventListener('pointerenter', function () { overCard = true; clearTimeout(hideT); });
        card.addEventListener('pointerleave', function () { overCard = false; if (pinned < 0) hideT = setTimeout(function () { setHover(-1); }, 240); });
      }
      // a tap on the ground sends out a ripple and closes a pinned card
      el.addEventListener('pointerdown', function (e) {
        if (e.target.closest('a,button,input,[data-card]')) return;
        if (pinned >= 0) { pinned = -1; hover = -2; setHover(-1); }
        if (p.y < farY + 16) return;
        var pl = toPlane(p.x, p.y, DEP); waves.push({ x: pl.x, z: pl.z, t0: U.now() }); if (waves.length > 4) waves.shift();
        pulse = 1; hole.tx = pl.x; hole.tz = pl.z;
      });

      if (C.init) C.init(env);
      // layout: runs on start and on every resize
      function build() {
        var s = U.sizeCanvas(cv, ctx); W = s.W; H = s.H; narrow = W < 760;
        f = Math.min(H * 0.9, W * (narrow ? 1.1 : 0.7));
        farY = H * (narrow ? C.farY[1] : C.farY[0]); hor = farY - (camY + ZF * ZF / (2 * RAD)) / ZF * f;
        XR = (W / 2) / f * ZF + 1;
        STARS = []; var ns = C.stars * (narrow ? 0.45 : 1);
        for (var si = 0; si < ns; si++) STARS.push({ x: Math.random() * W, y: Math.random() * farY * 0.94, r: Math.random() * 1.2 + 0.3, a: Math.random() * 0.6 + 0.3, tw: Math.random() * 6, sp: 0.0006 + Math.random() * 0.0026, big: Math.random() < 0.09 });
        env.W = W; env.H = H; env.farY = farY; env.narrow = narrow;
        env.hz = function (sx) { var xw = (sx - W / 2) * ZF / f; return hor + (camY + (xw * xw + ZF * ZF) / (2 * RAD)) / ZF * f; };
        // one spot per place in the page (there may be none)
        var spots = (narrow ? C.spotsM : C.spots).slice(0, labels.length);
        M = spots.map(function (q) { var pl = toPlane(q[0] * W, q[1] * H); return { x: pl.x, z: pl.z, A: 0.25, pv: 1, pvel: 0, near: false }; });
        var hs = narrow ? [0.5, 0.8] : [0.44, 0.72], h0 = toPlane(W * hs[0], H * hs[1], DEP); hole.x = hole.tx = h0.x; hole.z = hole.tz = h0.z;
        lsz = labels.map(function (a) { return [a.offsetWidth, a.offsetHeight]; });
      }
      // the card sits beside its label, never over the headline or button; on phones it is a sheet at the bottom
      function placeCard() {
        var i = cur(); if (i < 0 || card.hidden) return;
        var cw = card.offsetWidth, ch = card.offsetHeight, x, y;
        if (narrow) { x = 0; y = H - ch - 56; card.style.left = '16px'; card.style.right = '16px'; }
        else {
          var lq = lastLP[i], cp = U.$('.pl-copy', el), cb = cp ? cp.getBoundingClientRect().bottom - el.getBoundingClientRect().top + 18 : 76, lw = lsz[i][0], lh = lsz[i][1];
          y = Math.min(H - ch - 16, Math.max(cb, lq[1] - 10 - lh / 2 - ch / 2));
          var rgt = lq[0] + lw / 2 + 14, lft = lq[0] - lw / 2 - 14 - cw, okR = rgt + cw <= W - 16, okL = lft >= 16;
          x = lq[0] > W * 0.5 ? (okL ? lft : okR ? rgt : null) : (okR ? rgt : okL ? lft : null);
          if (x === null) x = U.clamp(lq[0] - cw / 2, 16, W - cw - 16);
          card.style.left = ''; card.style.right = '';
        }
        card.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      }

      function frame(t) {
        var c = cur();
        // the dip: it follows the pointer on the ground (not while the sun or moon is being dragged), or rests by an open place
        if (c >= 0) { var m0 = M[c]; hole.tx = m0.x + 0.9; hole.tz = m0.z + 0.2; }
        else if (p.inside && !env.busy && U.now() - p.last < 2600 && p.y > farY + 24) { var pl = toPlane(p.x, p.y, DEP); hole.tx = pl.x; hole.tz = pl.z; }
        var e = U.reduce ? 1 : 0.07; hole.x += (hole.tx - hole.x) * e; hole.z += (hole.tz - hole.z) * e;
        pulse *= 0.95; hole.A = 0.42 + pulse * 0.12;
        // the dip only exists under your pointer on the ground (or a place you are on), and eases away otherwise
        var onG = c >= 0 || (p.inside && !env.busy && U.now() - p.last < 2600 && p.y > farY + 24);
        hole.Ah = (hole.Ah || 0) + ((onG ? 1 : 0) - (hole.Ah || 0)) * (U.reduce ? 1 : 0.06); hole.A *= hole.Ah;
        // pop: when the dip you are steering reaches a place, its label springs up with a soft ring. The dip's position
        // in pointer terms (where the pointer would be to put it there) is compared with each place's dot and label.
        var steer = p.inside && !env.busy && U.now() - p.last < 2600 && p.y > farY + 24, hsP = steer ? proj(hole.x, hole.z, -DEP) : null;
        for (var i = 0; i < M.length; i++) {
          var Mi = M[i], dot = lastLP[i], lw = lsz[i] ? lsz[i][0] : 100, lh = lsz[i] ? lsz[i][1] : 40;
          var gr = Mi.near ? 16 : 0; // a little hysteresis so it does not flicker at the edge
          var nr = i === c || (steer && !!dot && Math.abs(hsP[0] - dot[0]) < lw / 2 + 14 + gr && hsP[1] > dot[1] - lh - 24 - gr && hsP[1] < dot[1] + 34 + gr);
          if (nr && !Mi.near && !U.reduce) Mi.pvel += 0.025;
          if (nr !== Mi.near) { Mi.near = nr; labels[i].classList.toggle('near', nr); }
          Mi.pvel += ((nr ? 1.04 : 1) - Mi.pv) * (U.reduce ? 1 : 0.16); Mi.pvel *= U.reduce ? 0 : 0.55; Mi.pv = U.reduce ? (nr ? 1.04 : 1) : Mi.pv + Mi.pvel;
          var At = i === c ? 0.4 : 0.25; Mi.A += (At - Mi.A) * 0.1;
        }
        waves = U.reduce ? [] : waves.filter(function (w) { return t - w.t0 < 4000; });

        // ----- sky -----
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = grad(ctx, 0, 0, 0, farY + 40, C.sky); ctx.fillRect(0, 0, W, H);
        if (C.pre) C.pre(t, env);
        if (STARS.length && env.starA > 0.01) {
          var SA = env.starA;
          ctx.fillStyle = C.starC;
          for (var s2 = 0; s2 < STARS.length; s2++) {
            var st = STARS[s2], fade = 1 - st.y / farY * 0.7, tw = U.reduce ? 0.7 : 0.5 + 0.5 * Math.sin(t * st.sp + st.tw);
            var al = st.a * fade * SA * (C.sparkle ? 0.2 + 0.8 * tw * tw : 0.75 + 0.25 * tw);
            ctx.globalAlpha = al; ctx.fillRect(st.x, st.y, st.r, st.r);
            if (C.sparkle && st.big) {
              var L = (2 + st.r * 3) * (0.4 + tw * 1.1), cx1 = st.x + st.r / 2, cy1 = st.y + st.r / 2;
              ctx.globalAlpha = al * 0.25; ctx.beginPath(); ctx.arc(cx1, cy1, L * 0.55, 0, U.TAU); ctx.fill();
              ctx.globalAlpha = al * 0.9; ctx.fillRect(cx1 - L, cy1 - 0.5, L * 2, 1); ctx.fillRect(cx1 - 0.5, cy1 - L, 1, L * 2);
              ctx.globalAlpha = al * 0.45; ctx.save(); ctx.translate(cx1, cy1); ctx.rotate(Math.PI / 4); ctx.fillRect(-L * 0.5, -0.4, L, 0.8); ctx.fillRect(-0.4, -L * 0.5, 0.8, L); ctx.restore();
            }
          }
          ctx.globalAlpha = 1;
          if (C.sparkle && !U.reduce) {
            if (!SHOOT && t > nextShoot) { var sx0 = W * (0.15 + Math.random() * 0.7), sy0 = farY * (0.05 + Math.random() * 0.35), ang = 0.35 + Math.random() * 0.35, spd = 9 + Math.random() * 5; SHOOT = { x: sx0, y: sy0, vx: Math.cos(ang) * spd * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(ang) * spd, life: 0 }; nextShoot = t + 3500 + Math.random() * 5500; }
            if (SHOOT) {
              SHOOT.life++; SHOOT.x += SHOOT.vx; SHOOT.y += SHOOT.vy;
              var k = SHOOT.life / 46, la2 = Math.sin(Math.PI * Math.min(1, k)) * SA, tl = ctx.createLinearGradient(SHOOT.x, SHOOT.y, SHOOT.x - SHOOT.vx * 9, SHOOT.y - SHOOT.vy * 9);
              tl.addColorStop(0, 'rgba(255,255,255,' + (0.95 * la2).toFixed(3) + ')'); tl.addColorStop(1, 'rgba(211,229,251,0)');
              ctx.strokeStyle = tl; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(SHOOT.x, SHOOT.y); ctx.lineTo(SHOOT.x - SHOOT.vx * 9, SHOOT.y - SHOOT.vy * 9); ctx.stroke();
              if (k >= 1 || SHOOT.y > farY) SHOOT = null;
            }
          }
        }
        if (C.sky2) C.sky2(ctx, t, env);

        // ----- ground: fill under the horizon, the glowing rim, rows across, lines into the distance -----
        var xr0 = (W / 2) / f * ZF + 0.5, hz = [];
        for (var hx0 = -xr0; hx0 <= xr0 + 0.01; hx0 += 0.25) hz.push(proj(hx0, ZF, depthAt(hx0, ZF, t)));
        ctx.fillStyle = grad(ctx, 0, farY - 10, 0, H, C.ground); ctx.beginPath(); ctx.moveTo(hz[0][0], hz[0][1]);
        for (var h1i = 1; h1i < hz.length; h1i++) ctx.lineTo(hz[h1i][0], hz[h1i][1]);
        ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fill();
        if (C.atmo) {
          ctx.save(); ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(hz[0][0], hz[0][1]); for (var h2 = 1; h2 < hz.length; h2++) ctx.lineTo(hz[h2][0], hz[h2][1]);
          ctx.shadowColor = C.atmo[0]; ctx.shadowBlur = C.atmo[3] || 26; ctx.strokeStyle = C.atmo[1]; ctx.lineWidth = 6; ctx.stroke();
          ctx.shadowBlur = 0; ctx.strokeStyle = C.atmo[2]; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
        }
        var rn = C.rowNear, rf = C.rowFar, ra = C.rowA;
        ctx.lineWidth = 1;
        for (var z = ZF; z >= ZN; z -= ZS) {
          var k1 = (z - ZN) / (ZF - ZN), near = 1.6 / (z + 0.6), col = [Math.round(rn[0] + (rf[0] - rn[0]) * k1), Math.round(rn[1] + (rf[1] - rn[1]) * k1), Math.round(rn[2] + (rf[2] - rn[2]) * k1)];
          var xr = (W / 2) / f * z + 0.5;
          ctx.strokeStyle = rgba(col, ra[0] + ra[1] * near); ctx.beginPath(); var first = true;
          for (var x = -xr; x <= xr; x += 0.18) { var pt = proj(x, z, depthAt(x, z, t)); if (first) { ctx.moveTo(pt[0], pt[1]); first = false; } else ctx.lineTo(pt[0], pt[1]); }
          ctx.stroke();
        }
        ctx.strokeStyle = grad(ctx, 0, farY, 0, H, C.cols);
        for (var cx0 = -XR; cx0 <= XR; cx0 += XS) {
          ctx.beginPath(); var f2 = true;
          for (var z2 = ZF; z2 >= ZN; z2 -= ZS / 2) { var p2 = proj(cx0, z2, depthAt(cx0, z2, t)); if (p2[0] < -200 || p2[0] > W + 200) { f2 = true; continue; } if (f2) { ctx.moveTo(p2[0], p2[1]); f2 = false; } else ctx.lineTo(p2[0], p2[1]); }
          ctx.stroke();
        }
        env.hzPts = hz; if (C.ground2) C.ground2(ctx, t, env);

        // ----- the places: a dot on the ground and the label (an HTML button) standing on it -----
        var lp = [];
        for (var j = 0; j < labels.length; j++) { var mj = M[j], pj = (j === c && frz) ? frz : proj(mj.x, mj.z, depthAt(mj.x, mj.z, t)); pj[1] = Math.min(pj[1], H - 14); lp.push(pj); }
        lastLP = lp;
        for (var jj = 0; jj < labels.length; jj++) {
          var mm = M[jj], sc = U.clamp(3.2 / mm.z, 0.9, 1.12) * (jj === c ? 1.05 : 1) * mm.pv, q2 = lp[jj];
          ctx.fillStyle = jj === c ? C.accent : C.dot; ctx.beginPath(); ctx.arc(q2[0], q2[1], jj === c ? 4 : 3, 0, U.TAU); ctx.fill();
          var lx = U.clamp(q2[0] - lsz[jj][0] / 2, 8, W - lsz[jj][0] - 8), ly = q2[1] - lsz[jj][1] - 10;
          labels[jj].style.transform = 'translate(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
        }
        placeCard();
      }
      var loop = U.loop(frame);
      return { start: function () { build(); loop.start(); }, stop: function () { loop.stop(); pinned = -1; hover = -2; setHover(-1); }, resize: build };
    });
  };
})();
