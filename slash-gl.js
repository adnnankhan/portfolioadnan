/* The cut in the paper, rendered on the GPU. The hero's paper is the page itself; this canvas, lying under the words, draws
   only where the paper has been cut: through each cut you see a deep world behind the page, darker under the paper's lip,
   with a fine lit edge on one side of the cut and a soft shadow the paper casts beside it. A fresh cut's edges glow; when it
   heals it closes from its ends (or, for the wind, from where it began) and leaves a seam that fades.
   Seven worlds, each a function of the pixel (no images):
     moon    a moonlit valley: stars, a big moon with thin cloud across it, three misted ridges, pampas grass, fireflies
     ember   a forge floor: molten cracks under heat shimmer, rolling smoke, embers rising at three depths
     world   space: nebula, stars, and a huge planet low in the frame with the hero's dotted lines, clouds, city lights,
             its atmosphere and a sun coming over the edge
     gold    kintsugi: black lacquer with veins and pools of hammered gold, drifting gold leaf, soft lights far away;
             the cut heals with a gold seam
     wind    the guiding wind: dusk, streams of wind with gusts running along them, pampas bending, seeds carried off
     storm   storm clouds lit from inside, a bolt when the blade cuts, slanting rain
     ink     sumi ink: ink drifting in water, a red sun, ink-wash mountains, gold flecks
   Each cut: an arc, centre h and radius r (CSS px), from angle th0 through D radians; t0 and dur (s, the blade passing along
   it), w (half-width px), open (s, when it parts; 0: right behind the blade), heal (s), heal mode, seam (s it stays).
   SlashGL(canvas, world) -> { ok, size(w, h, dpr), draw({ t, cuts, par: [x, y], flash }) } */
(function () {
  var N = 12;
  var VS = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }';
  var HEAD = [
    'precision highp float;',
    '#define N ' + N,
    'uniform vec2 uRes, uPar; uniform float uDpr, uT, uFlash; uniform vec4 uA[N], uB[N], uC[N], uE[N]; uniform vec3 uInk, uLip, uShade;',
    'vec2 P;',
    'float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }',
    'float noise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }',
    'float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 1.7; a *= .5; } return s; }',
    // the world's coordinates for a layer at depth k (the deeper, the less it follows the pointer): centred, in heights
    'vec2 U(float k) { return (P + uPar * k - .5 * uRes) / uRes.y; }',
    // a scatter of points in cells of `cell` px (dens = share of cells with one), drifting at v px/s, wobbling: (glow, its hash)
    'vec2 motes(vec2 q, float cell, float dens, float sz, vec2 v, float wob) {',
    '  q -= v * uT; vec2 id = floor(q / cell), f = q - (id + .5) * cell; float h = hash(id); if (h < 1. - dens) return vec2(0.);',
    '  vec2 o = (hash2(id + 5.) - .5) * cell * .55 + wob * vec2(sin(uT * 1.3 + h * 40.), cos(uT * 1.1 + h * 31.));',
    '  float d = length(f - o); return vec2(exp(-d * d / (sz * sz)) + .22 * exp(-d / (sz * 2.5)), h); }',
    'float stars(vec2 q, float cell, float dens, float sz) { vec2 s = motes(q, cell, dens, sz, vec2(0.), 0.);',
    '  return s.x * (.55 + .45 * sin(uT * (1.2 + 3. * s.y) + s.y * 70.)) * (.4 + .6 * fract(s.y * 13.)); }',
    // pampas grass rising from the bottom edge, leaning with the wind (bias), plumes at the tips: (blade, plume)
    'vec2 grass(vec2 q, float top, float bias) {',
    '  vec2 r = vec2(0.); if (q.y < uRes.y * top - 50.) return r;',
    '  float cw = 6., by = uRes.y + 8., avg = uRes.y * (1. - top) * .75, ke = clamp((by - q.y) / avg, 0., 1.2);',
    '  float cid = floor((q.x - bias * avg * ke * ke) / cw);',
    '  for (int j = -5; j <= 5; j++) { float id = cid + float(j), h = hash(vec2(id, 1.7)), h2 = hash(vec2(id, 9.1));',
    '    float hgt = uRes.y * (1. - top) * (.5 + .5 * h), k = (by - q.y) / hgt;',
    '    if (k < 0. || k > 1.25) continue;',
    '    float lean = (bias + .1 * sin(uT * 1.3 + id * .21) + .05 * sin(uT * 3.1 + id * .9)) * hgt, x0 = (id + .2 + .6 * h2) * cw;',
    '    float th = 1.4 * (1. - .7 * min(k, 1.));',
    '    if (k <= 1.) r.x = max(r.x, smoothstep(th + .9, th - .3, abs(q.x - x0 - lean * k * k)));',
    '    if (h > .35) { vec2 dv = normalize(vec2(2. * lean, -hgt)), dq = q - vec2(x0 + lean, by - hgt);',
    '      float al = dot(dq, dv), ac = dot(dq, vec2(-dv.y, dv.x));',
    '      r.y = max(r.y, exp(-ac * ac / 7. - pow(al + 9., 2.) / 110.) * (.5 + .5 * h) * (.75 + .25 * noise(q * .6))); } }',
    '  return r; }'
  ].join('\n');

  var W = {};
  W.moon = [
    'vec3 TINT = vec3(.6, .75, 1.);',
    'vec4 seamc(float s) { return vec4(vec3(.5, .58, .74), 1.) * s * .55; }',
    'vec3 world() {',
    '  vec2 u = U(.25);',
    '  vec3 c = mix(vec3(.12, .16, .27), vec3(.012, .018, .042), smoothstep(.3, -.5, u.y));',
    '  c += vec3(.95, .97, 1.) * stars(P + uPar * .25, 9., .16, .75) * smoothstep(.3, -.1, u.y);',
    // the moon: maria, a soft limb, its halo, and thin cloud passing in front
    '  vec2 m = u - vec2(.05, -.12); float r = length(m), R = .17; vec2 mq = m / R;',
    '  float disc = smoothstep(R + .0016, R - .0016, r);',
    '  vec3 mc = vec3(.97, .95, .9) * (1. - .3 * smoothstep(.46, .7, fbm(mq * 2.1 + 4.)) - .1 * fbm(mq * 11.)) * (.74 + .26 * sqrt(max(0., 1. - dot(mq, mq))));',
    '  c = mix(c, mc, disc);',
    '  c += (vec3(.5, .6, .9) * exp(-max(r - R, 0.) * 8.) * .24 + vec3(.75, .8, .95) * exp(-max(r - R, 0.) * 45.) * .3) * (1. - disc);',
    '  float cl = smoothstep(.52, .8, fbm(vec2(u.x * 1.5 - uT * .015, u.y * 7.5)));',
    '  c = mix(c, vec3(.3, .34, .46) * (.5 + 1.4 * exp(-r * 4.)), cl * .6 * smoothstep(.25, -.3, u.y));',
    // three ridges, nearer ones darker, mist lying in front of each
    '  for (int i = 0; i < 3; i++) { float fi = float(i); vec2 v = U(.45 + fi * .35);',
    '    float ridge = .03 + fi * .085 - .14 * fbm(vec2(v.x * (1.5 + fi * .9) + fi * 7.3, fi * 3.1));',
    '    float a = smoothstep(ridge - .0015, ridge + .0015, v.y);',
    '    vec3 mcol = mix(vec3(.13, .16, .26), vec3(.018, .022, .036), fi / 2.);',
    '    mcol = mix(mcol, vec3(.32, .37, .52), smoothstep(ridge + .02, ridge + .16, v.y) * (.28 - fi * .1));',
    '    c = mix(c, mcol, a); }',
    // pampas in the foreground, silver plumes in the moonlight
    '  vec2 g = grass(P + uPar * 1.4, .6, .1);',
    '  c = mix(c, vec3(.01, .012, .02), g.x); c = mix(c, vec3(.72, .78, .92), g.y * .85);',
    // fireflies
    '  vec2 f = motes(P + uPar * 1.2, 80., .35, 1.6, vec2(7., -5.), 9.);',
    '  c += vec3(.85, 1., .45) * f.x * (.25 + .75 * pow(.5 + .5 * sin(uT * 2.2 + f.y * 60.), 3.)) * smoothstep(-.2, .2, u.y) * 1.3;',
    '  return c; }'
  ].join('\n');

  W.ember = [
    'vec3 TINT = vec3(1., .45, .1);',
    'vec4 seamc(float s) { return vec4(mix(vec3(.4, .07, .02), vec3(1., .52, .16), s), 1.) * s * .9; }',
    'vec3 heat(float x) { x = clamp(x, 0., 1.);',
    '  vec3 c = mix(vec3(0.), vec3(.3, .02, .004), smoothstep(0., .3, x)); c = mix(c, vec3(1., .33, .04), smoothstep(.25, .6, x));',
    '  c = mix(c, vec3(1., .78, .32), smoothstep(.55, .86, x)); return mix(c, vec3(1., .97, .9), smoothstep(.86, 1., x)); }',
    'vec2 vor(vec2 x) { vec2 n = floor(x), f = fract(x); float d1 = 8., d2 = 8.;',
    '  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)), o = hash2(n + g);',
    '    o = .5 + .42 * sin(uT * .25 + 6.2831 * o); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }',
    '  return vec2(d1, d2); }',
    'vec3 world() {',
    '  vec2 u = U(.35);',
    '  vec2 w = u + (vec2(noise(u * 9. + vec2(0., uT * 1.8)), noise(u * 9. + vec2(7., uT * 1.8))) - .5) * .009;',
    '  vec2 v = vor(w * 6. + vec2(0., uT * .04));',
    '  float crack = exp(-(v.y - v.x) * 13.), bed = fbm(w * 2.4 + vec2(uT * .02, -uT * .06)), low = smoothstep(-.55, .5, u.y);',
    '  float H = bed * (.32 + .55 * low) + crack * (.3 + .6 * bed) * (.45 + .55 * low);',
    '  H *= .86 + .14 * sin(uT * 2. + bed * 9.);',
    '  vec3 c = heat(H);',
    '  c *= 1. - .6 * smoothstep(.45, .8, fbm(u * 2.8 + vec2(uT * .03, uT * .22))) * (1. - low * .5);',
    '  for (int i = 0; i < 3; i++) { float fi = float(i); vec2 q = P + uPar * (.6 + fi * .5); q.x += 18. * sin(q.y * .01 + uT * .8 + fi);',
    '    vec2 e = motes(q, 46. + fi * 30., .45, 1. + fi * .7, vec2(10. + fi * 6., -(40. + fi * 38.)), 6.);',
    '    c += heat(.72 + .28 * e.y) * e.x * (.6 + .4 * sin(uT * 9. + e.y * 50.)) * (1.3 - fi * .2); }',
    '  return c; }'
  ].join('\n');

  W.world = [
    'vec3 TINT = vec3(.45, .75, 1.);',
    'vec4 seamc(float s) { return vec4(vec3(.3, .58, .95), 1.) * s * .6; }',
    'vec3 world() {',
    '  vec2 u = U(.2);',
    '  vec3 c = vec3(.006, .01, .028);',
    '  c += vec3(.22, .09, .42) * pow(fbm(u * 1.8 + vec2(2., uT * .004)), 3.) * 1.6 + vec3(.04, .24, .36) * pow(fbm(u * 3.5 + vec2(-uT * .006, 7.)), 4.) * 1.8;',
    '  c += vec3(1.) * stars(P + uPar * .2, 8., .12, .65) + vec3(.8, .9, 1.) * stars(P + uPar * .35 + 300., 23., .2, 1.1) * 1.3;',
    '  vec2 C = vec2(-.05, .8), v = U(.7) - C; float R = .7, r = length(v); vec2 sd = normalize(vec2(.55, -.65));',
    '  if (r < R) { vec3 n = vec3(v, sqrt(R * R - r * r)) / R;',
    '    float lon = atan(n.x, n.z) + uT * .03, lat = asin(clamp(-n.y, -1., 1.)); vec2 gq = vec2(lon * 2.2, lat * 3.2);',
    '    float land = smoothstep(.53, .56, fbm(gq + 11.));',
    '    vec3 Ls = normalize(vec3(sd * 1.1, .45)); float dif = dot(n, Ls), day = smoothstep(-.12, .25, dif);',
    '    vec3 sc = mix(vec3(.02, .09, .21), mix(vec3(.08, .16, .07), vec3(.36, .3, .2), fbm(gq * 3.)), land) * (.06 + 1.15 * max(dif, 0.));',
    '    float cl = smoothstep(.5, .75, fbm(gq * 1.6 + vec2(uT * .02, 3.)));',
    '    sc = mix(sc, vec3(.95) * (.04 + 1.1 * max(dif, 0.)), cl * .8);',
    '    sc += vec3(1., .95, .85) * pow(max(dot(n, normalize(Ls + vec3(0., 0., 1.))), 0.), 60.) * (1. - land) * (1. - cl) * .8;',
    '    sc += vec3(1., .75, .4) * step(.95, hash(floor(gq * 140.))) * land * (1. - cl) * (1. - day) * smoothstep(.5, .6, fbm(gq * 5.)) * .9;',
    // the dotted lines of the world, as on the hero's globe
    '    float la = abs(fract(lat / .2618) - .5), lo = abs(fract(lon / .2618) - .5);',
    '    float dl = (smoothstep(.035, .012, la) * smoothstep(.3, .15, abs(fract(lon * 22.9) - .5)) + smoothstep(.035, .012, lo) * smoothstep(.3, .15, abs(fract(lat * 22.9) - .5)));',
    '    sc += vec3(.6, .8, 1.) * min(dl, 1.) * .16 * (.3 + day);',
    '    sc += vec3(.3, .6, 1.) * pow(1. - n.z, 3.) * (.2 + 1.2 * day);',
    '    c = mix(c, sc, smoothstep(R, R - .002, r)); }',
    '  else c += vec3(.25, .55, 1.) * exp(-(r - R) * 22.) * .55 * smoothstep(-.3, .7, dot(v / r, sd));',
    '  float s = length(U(.7) - C - sd * (R + .008));',
    '  c += vec3(1., .9, .75) * (exp(-s * 70.) * 1.3 + exp(-s * 9.) * .22);',
    '  return c; }'
  ].join('\n');

  W.gold = [
    'vec3 TINT = vec3(1., .78, .36);',
    'vec4 seamc(float s) { float sp = pow(noise(P * .35 + uT * 1.5), 6.) * 3.; return vec4(vec3(.86, .62, .26) * (.85 + sp), 1.) * s; }',
    'float fg(vec2 u) { vec2 q = u * 2.; q += .5 * vec2(fbm(q * 1.2 + vec2(uT * .02, 0.)), fbm(q * 1.2 + vec2(5.2, -uT * .02))); return fbm(q * 1.6 + 3.); }',
    'vec3 world() {',
    '  vec2 u = U(.4);',
    '  vec3 c = vec3(.03, .02, .016) + vec3(.3, .2, .13) * exp(-pow((u.x * .5 + u.y - .05) / .25, 2.)) * .6 + vec3(.1, .07, .05) * fbm(u * 6.);',
    '  float e = 1.5 / uRes.y, f = fg(u); vec2 gr = vec2(fg(u + vec2(e, 0.)) - f, fg(u + vec2(0., e)) - f) / e;',
    '  float dpx = abs(fract(f * 11. + .5) - .5) / max(11. * length(gr), 1e-3) * uRes.y;',
    '  float wv = .8 + 3. * smoothstep(.35, .7, fbm(u * 3. + 9.));',
    '  float gm = max(smoothstep(wv + 1., wv - .5, dpx), smoothstep(.6, .63, f));',
    '  vec3 n = normalize(vec3(-gr * .045, 1.)), Lg = normalize(vec3(-.3, -.6, .75));',
    '  vec3 gc = vec3(.85, .6, .26) * (.35 + .65 * max(dot(n, Lg), 0.)) + vec3(1., .9, .65) * pow(max(reflect(-Lg, n).z, 0.), 18.) * 1.2;',
    '  c = mix(c, gc * (.85 + .3 * noise(P * .35)), gm);',
    '  vec2 m = motes(P + uPar * 1.1, 44., .4, 2.4, vec2(-6., 9.), 5.);',
    '  c += vec3(1., .82, .45) * m.x * (.45 + 1.6 * pow(abs(sin(uT * 1.7 + m.y * 40.)), 12.));',
    '  c += vec3(.6, .42, .18) * motes(P + uPar * .2, 140., .25, 14., vec2(3., -2.), 8.).x * .12;',
    '  return c; }'
  ].join('\n');

  // the wind, at the golden hour: a violet-to-gold sky with a low sun, far ridges in haze, a field of pampas lit from behind
  // with the wind running through it in bright waves, streams of wind in the air, seeds and red leaves carried off
  W.wind = [
    'vec3 TINT = vec3(1., .82, .55);',
    'vec4 seamc(float s) { return vec4(vec3(.62, .55, .48), 1.) * s * .5; }',
    'vec3 world() {',
    '  vec2 u = U(.25); float hy = .12, k = clamp((u.y + .5) / (hy + .5), 0., 1.);',
    '  vec3 c = mix(vec3(.13, .1, .24), vec3(.58, .24, .33), smoothstep(0., .55, k));',
    '  c = mix(c, vec3(.98, .52, .24), smoothstep(.45, .86, k)); c = mix(c, vec3(1., .84, .52), smoothstep(.82, 1., k));',
    '  vec2 sp = U(.15) - vec2(-.2, hy - .025); float sr = length(sp);',
    '  c += vec3(1., .7, .38) * exp(-sr * 4.5) * .5 + vec3(1., .9, .7) * exp(-sr * 16.) * .55;',
    '  c = mix(c, vec3(1., .97, .88), smoothstep(.058, .054, sr));',
    '  float cl = smoothstep(.56, .84, fbm(vec2(u.x * 1.2 + uT * .008, u.y * 6.5)));',
    '  c = mix(c, mix(vec3(.42, .2, .32), vec3(1., .62, .4), k), cl * .55 * (1. - k * .5));',
    // two far ridges in violet haze
    '  for (int i = 0; i < 2; i++) { float fi = float(i); vec2 v = U(.35 + fi * .25);',
    '    float ridge = hy + .004 - (.05 + .04 * fi) * fbm(vec2(v.x * (2.2 + fi * 1.6) + fi * 4.1, fi * 2.));',
    '    vec3 mc = mix(mix(vec3(.62, .34, .4), vec3(.4, .2, .3), fi), c, .3 - fi * .12);',
    '    c = mix(c, mc, smoothstep(ridge - .0015, ridge + .0015, v.y)); }',
    // the field: golden, darker toward you, rows of grass rippling, bright waves where the wind runs through it
    '  vec2 f = U(.6); float fd = smoothstep(hy, .5, f.y);',
    '  vec3 fc = mix(vec3(.95, .62, .3), vec3(.36, .17, .08), fd);',
    '  fc *= .82 + .32 * fbm(vec2(f.x * 26. + f.y * 9. - uT * .7, f.y * 40.));',
    '  fc += vec3(1., .8, .5) * smoothstep(.58, .8, fbm(vec2(f.x * 2.4 + uT * .45, f.y * 5.))) * (1. - fd * .6) * .4;',
    '  c = mix(c, fc, smoothstep(hy, hy + .004, f.y));',
    // streams of wind in the air, gusts running along them (to the left, as the wind blows)
    '  for (int i = 0; i < 2; i++) { float fi = float(i); vec2 v = U(.5 + fi * .8);',
    '    float psi = v.y + .14 * fbm(v * vec2(1.2, 2.) + vec2(uT * .05 + fi * 3., fi)) + .03 * sin(v.x * 4. + uT * .4);',
    '    float NL = 22. + fi * 12., lf = psi * NL, li = floor(lf + .5), dpx = abs(lf - li) / NL * uRes.y, th = .5 + fi * .3;',
    '    float h = hash(vec2(li, fi)), gx = fract(v.x * (.35 + .2 * h) + uT * (.12 + .1 * h) * (1. + fi) + h * 7.);',
    '    float gust = smoothstep(0., .16, gx) * smoothstep(.42, .16, gx) * step(.4, h);',
    '    c += vec3(1., .95, .85) * smoothstep(th + 1., th, dpx) * gust * (.35 + .4 * fi); }',
    // pampas close by: dark stems, plumes glowing with the sun behind them
    '  vec2 g = grass(P + uPar * 1.4, .7, -.22);',
    '  c = mix(c, vec3(.5, .26, .12), g.x * .55); c = mix(c, vec3(1., .9, .7), g.y * .95);',
    '  c += vec3(1., .96, .88) * motes(P + uPar * 1.3, 64., .38, 1.3, vec2(-110., 14.), 8.).x * .85;',
    '  vec2 lf = motes(P + uPar * 1.7, 130., .3, 3.4, vec2(-150., 34.), 10.);',
    '  c = mix(c, mix(vec3(.72, .13, .06), vec3(.86, .42, .14), fract(lf.y * 5.)), clamp(lf.x * 1.5, 0., 1.) * step(.45, fract(lf.y * 7.)));',
    '  return c; }'
  ].join('\n');

  W.storm = [
    'vec3 TINT = vec3(.6, .75, 1.);',
    'vec4 seamc(float s) { return vec4(vec3(.45, .65, 1.), 1.) * s * (.35 + .65 * step(.45, hash(vec2(floor(uT * 24.), floor(P.x / 26.))))); }',
    'vec3 world() {',
    '  vec2 u = U(.35);',
    '  float fs = floor(uT * 1.1), fp = fract(uT * 1.1);',
    '  float fl = max(step(.4, hash(vec2(fs, 4.))) * exp(-fp * 7.) * (.7 + .3 * sin(fp * 80.)), uFlash);',
    '  float sd = uFlash > step(.4, hash(vec2(fs, 4.))) * exp(-fp * 7.) ? 77. : fs;',
    '  vec2 lp = vec2((hash(vec2(sd, 8.)) - .5) * 1.2, -.32);',
    '  float dens = smoothstep(.3, .8, fbm(u * vec2(1.4, 2.6) + vec2(uT * .02, 0.)) * .7 + fbm(u * 4. + vec2(-uT * .04, 3.)) * .4);',
    '  vec3 c = mix(vec3(.05, .06, .09), vec3(.24, .26, .36), dens) + vec3(.12, .14, .22) * smoothstep(.5, .9, dens) * smoothstep(.3, -.5, u.y);',
    '  c += vec3(.55, .62, .95) * exp(-length((u - lp) * vec2(1., 1.6)) * 2.6) * fl * (.4 + 1.6 * dens) + vec3(.25, .28, .4) * fl * .25;',
    '  if (fl > .15) { float bx = lp.x + .1 * (fbm(vec2(u.y * 5., sd)) - .5) + .025 * (noise(vec2(u.y * 40., sd)) - .5);',
    '    float d = abs(u.x - bx) * uRes.y, mm = smoothstep(lp.y - .02, lp.y + .05, u.y) * smoothstep(.52, .3, u.y);',
    '    float bx2 = bx + (u.y - .02) * .5 + .02 * (noise(vec2(u.y * 30., sd + 3.)) - .5), d2 = abs(u.x - bx2) * uRes.y, m2 = smoothstep(.0, .03, u.y) * smoothstep(.2, .08, u.y);',
    '    c += ((vec3(.85, .9, 1.) * exp(-d * d / 3.) * 1.6 + vec3(.4, .5, 1.) * exp(-d / 14.) * .5) * mm + vec3(.8, .85, 1.) * exp(-d2 * d2 / 1.5) * m2) * fl; }',
    '  vec2 r = P + uPar * 1.2; r.x += r.y * .22;',
    '  float h = hash(vec2(floor(r.x / 5.), 2.)), yy = fract(r.y / (uRes.y * .35) - uT * (2.2 + h) + h * 9.);',
    '  c += vec3(.55, .6, .75) * smoothstep(0., .02, yy) * smoothstep(.12, .03, yy) * step(.55, h) * smoothstep(1.2, .2, abs(fract(r.x / 5.) - .5) * 5.) * (.3 + .8 * fl);',
    '  return c; }'
  ].join('\n');

  W.ink = [
    'vec3 TINT = vec3(1., .35, .25);',
    'vec4 seamc(float s) { return vec4(vec3(.06, .055, .05), 1.) * s * .7; }',
    'vec3 world() {',
    '  vec2 u = U(.25);',
    '  vec3 c = mix(vec3(.36, .34, .31), vec3(.12, .115, .11), smoothstep(.4, -.5, u.y));',
    '  vec2 q = u * 1.8; q += .6 * vec2(fbm(q + vec2(uT * .03, 0.)), fbm(q + vec2(4., -uT * .03)));',
    '  c = mix(c, vec3(.05, .048, .045), smoothstep(.5, .78, fbm(q * 2.)) * .7);',
    '  vec2 sp = u - vec2(.16, -.1); float r = length(sp), R = .2;',
    '  float sun = smoothstep(R + .003, R - .003, r + (noise(sp * 40.) - .5) * .005);',
    '  c = mix(c, vec3(.78, .12, .08) * (.9 + .1 * fbm(sp * 8.)), sun); c += vec3(.5, .06, .03) * exp(-max(r - R, 0.) * 14.) * .35 * (1. - sun);',
    '  for (int i = 0; i < 3; i++) { float fi = float(i); vec2 v = U(.45 + fi * .35);',
    '    float ridge = -.14 + fi * .17 + .3 * (.5 - fbm(vec2(v.x * (1.3 + fi * .8) + fi * 5.1, fi * 2.3))), a = smoothstep(ridge - .002, ridge + .002, v.y);',
    '    vec3 top = vec3(.34 - fi * .15), mist = vec3(.62 - fi * .2);',
    '    c = mix(c, mix(top, mist, smoothstep(0., .2, v.y - ridge) * (1. - fi * .3)) * (.9 + .2 * fbm(v * 30.)), a); }',
    '  c = mix(c, vec3(.52, .5, .47), smoothstep(.2, .4, u.y) * .45 * (.7 + .3 * fbm(u * vec2(2., 8.) + uT * .02)));',
    '  c += vec3(.9, .7, .35) * motes(P + uPar, 80., .2, 1.2, vec2(-4., 6.), 5.).x * .6;',
    '  return c; }'
  ].join('\n');

  var MAIN = [
    'void main() {',
    '  P = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',
    '  float gap = 0., inside = -1e4, side = 0., hot = 0., sh = 0., seam = 0., hair = 0., spill = 0.;',
    '  for (int i = 0; i < N; i++) { vec4 A = uA[i], B = uB[i], C = uC[i], E = uE[i]; if (B.z <= 0.) continue;',
    // a cut is a straight line, a (A.xy) to b (A.zw): where the turning blade crossed the paper; s runs along it, 0 to 1,
    // and the blade has reached prog. (With E.z set it is an arc instead: centre A.xy, radius A.z, from angle A.w through
    // E.y radians.)
    '    float prog = clamp((uT - B.x) / max(B.y, .001), 0., 1.), s, L; vec2 cp, dir;',
    '    if (E.z > .5) { vec2 hd = P - A.xy; if (abs(length(hd) - A.z) > B.z + 70.) continue;',
    '      float D = E.y, dm = mod(atan(hd.y, hd.x) - (A.w + D * .5) + 3.14159265, 6.2831853) - 3.14159265; L = max(abs(D) * A.z, 1.);',
    '      s = clamp(.5 + dm / D, 0., prog); float an = A.w + D * s; cp = A.xy + A.z * vec2(cos(an), sin(an)); dir = sign(D) * vec2(-sin(an), cos(an)); }',
    '    else { vec2 ab = A.zw - A.xy; L = max(length(ab), 1.); dir = ab / L; s = clamp(dot(P - A.xy, dir) / L, 0., prog); cp = A.xy + ab * s; }',
    '    float dist = length(P - cp); if (dist > B.z + 70.) continue;',
    // a slim lens: widest in its middle, a fine point at each end
    '    float bt = B.x + s * B.y, age = uT - max(bt, E.x), tp = pow(sin(3.14159 * s), .62);',
    '    if (prog < 1.) tp *= sqrt(clamp((prog - s) * L / 50., 0., 1.));',
    // it parts with a little give (a spring past open, then settles), and until then it is only a scratch where the blade went
    '    float op = age > 0. ? max(0., 1. - exp(-age * 7.) * cos(age * 12.)) : 0.;',
    '    if (uT >= bt && age <= 0.) hair = max(hair, exp(-dist * dist / .7) * tp);',
    '    float hk = C.z < .5 ? clamp((uT - B.w - (1. - tp) * .3) / .75, 0., 1.) : clamp((uT - B.w - s * .7) / .45, 0., 1.);',
    '    hk = hk * hk * (3. - 2. * hk);',
    '    float w = B.z * tp * op * (1. - hk), g = clamp(w - dist + .5, 0., 1.);',
    '    gap = max(gap, g);',
    '    if (w - dist > inside) { inside = w - dist; side = dot(P - cp, vec2(-dir.y, dir.x)); }',
    // the light behind comes through: a soft spill on the paper round the cut, brighter while it is fresh; one side of the
    // paper lifts a little (a fine shade along it)
    '    float sd = dot(P - cp, vec2(-dir.y, dir.x)), fresh = age > 0. ? exp(-age * 2.2) : 0.;',
    '    spill = max(spill, exp(-max(dist - w, 0.) / (5. + 9. * clamp(w / 6., 0., 1.))) * clamp(w / 2.5, 0., 1.) * (1. - g) * (.55 + .9 * fresh));',
    '    hot = max(hot, fresh * g);',
    '    sh = max(sh, smoothstep(w + 4., w, dist) * clamp(w / 3., 0., 1.) * (1. - g) * step(0., sd));',
    '    float sf = hk > 0. ? (1. - smoothstep(B.w + .75, B.w + .75 + C.w, uT)) * smoothstep(0., .6, hk) : 0.;',
    '    seam = max(seam, sf * exp(-dist * dist / SEAMW) * tp); }',
    '  if (gap <= 0. && sh < .003 && seam < .003 && hair < .003 && spill < .003) { gl_FragColor = vec4(0.); return; }',
    '  vec4 o = vec4(TINT, 1.) * spill * .3;',
    '  o = vec4(vec3(.05, .035, .03), 1.) * sh * .3 + o * (1. - sh * .3);',
    '  o = vec4(uInk, 1.) * hair * .62 + o * (1. - hair * .62);',
    // inside: the world, lit toward the middle of the slit, warmer while fresh; a hair of lit paper edge on one side
    '  if (gap > 0.) { vec3 c = world(); float dep = clamp(inside / 3., 0., 1.);',
    '    c = c * (.7 + .3 * dep) + TINT * (.12 + .7 * hot) * (1. - dep * .4);',
    '    c = mix(c, side > 0. ? uLip : uShade, (1. - smoothstep(0., 1., inside)) * .6);',
    '    o = vec4(c, 1.) * gap + o * (1. - gap); }',
    '  vec4 sc = seamc(seam); o = sc + o * (1. - sc.a);',
    '  gl_FragColor = o;',
    '}'].join('\n');
  var SEAMW = { gold: '6.', ink: '7.5' };

  window.SlashGL = function (cv, kind) {
    var gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }) || cv.getContext('experimental-webgl');
    if (!gl || !W[kind]) return { ok: false };
    // the world's shader is large, so it is compiled in the background (where the browser can) and only used once it is
    // ready: asking for its status straight away would hold up the page (and the katana's own shader) until it is built
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, HEAD + '\n#define SEAMW ' + (SEAMW[kind] || '2.2') + '\n' + W[kind] + '\n' + MAIN);
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    var PAR = gl.getExtension('KHR_parallel_shader_compile'), ready = false, failed = false, U = {}, buf = null, loc = 0;
    var asked = 0;
    function check() {
      if (ready || failed) return ready;
      var now = performance.now(); if (now - asked < 90) return false; asked = now;
      if (PAR && !gl.getProgramParameter(pr, PAR.COMPLETION_STATUS_KHR)) return false;
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { failed = true; console.error(gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(pr)); return false; }
      gl.useProgram(pr);
      buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); loc = gl.getAttribLocation(pr, 'p');
      ['uRes', 'uPar', 'uDpr', 'uT', 'uFlash', 'uA', 'uB', 'uC', 'uE', 'uInk', 'uLip', 'uShade'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
      ready = true; return true;
    }
    var A = new Float32Array(N * 4), B = new Float32Array(N * 4), C = new Float32Array(N * 4), E = new Float32Array(N * 4), dpr = 1;
    function size(w, h, d) { dpr = d; cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.width = w + 'px'; cv.style.height = h + 'px'; gl.viewport(0, 0, cv.width, cv.height); }
    function draw(u) {
      if (!check()) return;
      gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      A.fill(0); B.fill(0); C.fill(0); E.fill(0);
      for (var i = 0; i < Math.min(N, u.cuts.length); i++) { var c = u.cuts[i], j = i * 4;
        if (c.h) { A[j] = c.h[0]; A[j + 1] = c.h[1]; A[j + 2] = c.r; A[j + 3] = c.th0; } else { A[j] = c.a[0]; A[j + 1] = c.a[1]; A[j + 2] = c.b[0]; A[j + 3] = c.b[1]; }
        B[j] = c.t0; B[j + 1] = c.dur; B[j + 2] = c.w; B[j + 3] = c.heal;
        C[j] = c.tap0 ? 1 : 0; C[j + 1] = c.tap1 ? 1 : 0; C[j + 2] = c.mode || 0; C[j + 3] = c.seam; E[j] = c.open || 0; E[j + 1] = c.D || 0; E[j + 2] = c.h ? 1 : 0; }
      gl.uniform2f(U.uRes, cv.width / dpr, cv.height / dpr); gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uT, u.t);
      gl.uniform2f(U.uPar, u.par[0], u.par[1]); gl.uniform1f(U.uFlash, u.flash || 0);
      var P = u.paper || { ink: [.15, .13, .12], lip: [1, .99, .96], shade: [.55, .5, .45] }; gl.uniform3fv(U.uInk, P.ink); gl.uniform3fv(U.uLip, P.lip); gl.uniform3fv(U.uShade, P.shade);
      gl.uniform4fv(U.uA, A); gl.uniform4fv(U.uB, B); gl.uniform4fv(U.uC, C); gl.uniform4fv(U.uE, E);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function clear() { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    return { ok: true, size: size, draw: draw, clear: clear, ready: check, N: N };
  };
})();
