/* The katana, rendered per pixel on the GPU so it reads as a real object: every surface is lit by a studio (an overhead
   softbox, a white floor, a black card, a thin rim light) and shaded from its true cross-section:
     blade     a ridged, polished blade: the flat by the spine (dark), the ridge line (a crisp change in the reflection), the
               convex face down to the edge (bright floor reflection with a dark card stripe), a frosted wavy temper line
               with its glittering crystals, forging grain, the cutting edge and the spine catching the light
     scabbard  glossy black lacquer (a cylinder): two clean highlights, rising at the edges like a clear coat
     fittings  gold collar, mouth ring and end cap; a pitted iron guard with a gold rim; a silk-wrapped grip over white
               ray skin (the diamonds), its gold ornament; an iron pommel
   plus a soft contact shadow on the paper, the warm light of the sparks on the steel, a light that sweeps along the blade,
   and reflections that shift a little with the pointer (as if you tilted it).
   KatanaGL(canvas) -> { draw(u), ok } ; u: { s (px per unit), ox, oy (px of the sword origin), saya (scabbard offset),
   sayaA, sw: [dx, dy, rot], glint (unit x or -1e4), spark: [x, y, power], env (pointer shift), alpha } */
(function () {
  var VS = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }';
  var FS = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uDpr, uS, uSaya, uSayaA, uGlint, uEnv, uAlpha; uniform vec2 uO; uniform vec3 uSw; uniform vec3 uSpark; uniform sampler2D uMark; uniform vec4 uMarkR; uniform float uMarkA, uFlip;',
    'float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }',
    'float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= .5; } return s; }',
    // the studio, as seen in a mirror direction r (x right, y down, z toward you)
    'vec3 env(vec3 r) {',
    '  float up = -r.y;',
    '  vec3 c = mix(vec3(.16, .175, .2), vec3(.42, .45, .5), smoothstep(-.1, .5, up));',
    '  c += vec3(1., .99, .97) * smoothstep(.46, .58, up) * (1. - smoothstep(.86, .95, up)) * .95;',
    '  c += vec3(.5, .55, .62) * smoothstep(.95, 1., up);',
    '  c += vec3(.86, .88, .91) * smoothstep(-.18, -.52, up);',
    '  c *= 1. - .78 * exp(-pow((up + .64) / .065, 2.));',
    '  c += vec3(.97) * exp(-pow((up - .30) / .028, 2.)) * .5;',
    '  c *= .84 + .3 * smoothstep(-.7, .35, r.x + uEnv);',
    '  return c; }',
    'vec3 L = normalize(vec3(-.35, -.75, .56));',
    'vec3 mirror(vec3 n) { return vec3(0., 0., -1.) + 2. * n.z * n; }',
    'void over(inout vec4 acc, vec3 c, float a) { acc = vec4(c * a, a) + acc * (1. - a); }',
    'float cov(float d) { return clamp(d * uS + .5, 0., 1.); }',
    'vec3 gold(vec3 n) { vec3 r = mirror(n); return vec3(1., .77, .40) * (env(r) * .92 + .06) + vec3(.06, .04, .01) * max(dot(n, L), 0.); }',
    'vec3 iron(vec2 q, vec3 n) { float g = .65 * noise(q * .16) + .35 * noise(q * .37); vec3 nn = normalize(n + vec3(noise(q * .5) - .5, noise(q * .5 + 9.) - .5, 0.) * .5);',
    '  return vec3(.10, .09, .085) * (.7 + .6 * g) * (.45 + .8 * max(dot(nn, L), 0.)) + env(mirror(nn)) * .1; }',
    'void main() {',
    '  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',
    '  vec2 q = (p - uO) / uS;',
    // the sword moves as one (the scabbard separately)
    '  vec2 c0 = q - uSw.xy - vec2(1000., 0.); float cr = cos(-uSw.z), sr = sin(-uSw.z); vec2 qs = vec2(c0.x * cr - c0.y * sr, c0.x * sr + c0.y * cr) + vec2(1000., 0.); qs.y *= uFlip;',
    '  if ((qs.x < -60. || qs.x > 2060. || abs(qs.y) > 170.) && (uSayaA < .005 || q.x < 400. || q.x > 2060. + uSaya || abs(q.y) > 80.)) { gl_FragColor = vec4(0.); return; }',
    '  vec4 acc = vec4(0.);',
    // contact shadow on the paper
    '  { float x0 = 48., x1 = max(1966., uSayaA > .01 ? 1998. + uSaya : 1966.); vec2 sq = qs - vec2(0., 30.);',
    '    float dx = max(max(x0 - sq.x, sq.x - x1), 0.), dy = max(abs(sq.y) - 10., 0.); float sh = exp(-(dx * dx + dy * dy) / (2. * 17. * 17.));',
    '    over(acc, vec3(.07, .09, .14), sh * .09); }',
    '  float x = qs.x, y = qs.y; vec3 n; vec3 col; float a;',
    // pommel
    '  { vec2 d = abs(qs - vec2(66., 0.)) - vec2(18., 42.) + 12.; float sd = length(max(d, 0.)) + min(max(d.x, d.y), 0.) - 12.; a = cov(-sd);',
    '    if (a > 0.) { float ny = clamp(y / 42., -.98, .98); n = vec3(0., ny, sqrt(1. - ny * ny)); col = iron(qs, n); if (sd > -3.) col = gold(n); over(acc, col, a); } }',
    // grip: silk wrap over ray skin, as a cylinder
    '  if (x > 78. && x < 382.) { float r = 38.; a = cov(r - abs(y)) * cov(x - 80.) * cov(380. - x);',
    '    if (a > 0.) { float ny = clamp(y / r, -.98, .98); n = vec3(0., ny, sqrt(1. - ny * ny));',
    '      float px = mod(x - 80., 44.), dd = abs(px - 22.) / 14. + abs(y) / 22.;',
    '      if (dd < 1.) { vec3 nn = normalize(n + vec3(noise(qs * .9) - .5, noise(qs * .9 + 7.) - .5, 0.) * .5);',
    '        col = vec3(.93, .9, .83) * (.32 + .78 * max(dot(nn, L), 0.)) + vec3(.25) * pow(max(dot(mirror(nn), L), 0.), 24.);',
    '        col *= .9 + .1 * smoothstep(1., .7, dd); }',
    '      else { float side = sign(y) * sign(px - 22.); float braid = .5 + .5 * sin((px * side + y) * 1.5);',
    '        vec3 nn = normalize(n + vec3(sign(px - 22.), sign(y), 0.) * .35 * smoothstep(1.25, 1., dd));',
    '        col = vec3(.07, .055, .05) * (.35 + .9 * max(dot(nn, L), 0.)) + vec3(.42, .4, .38) * pow(max(dot(mirror(nn), L), 0.), 14.) * (.35 + .65 * braid);',
    '        col *= 1. - .35 * smoothstep(1.06, 1., dd); }',
    '      vec2 m = (qs - vec2(236., 2.)) / vec2(18., 9.); float md = dot(m, m); if (md < 1.) { vec3 nm = normalize(vec3(m.x * .7, m.y * .7, 1.)); col = mix(col, gold(nm), smoothstep(1., .85, md)); }',
    '      over(acc, col, a); } }',
    // collar by the guard
    '  { vec2 d = abs(qs - vec2(396., 0.)) - vec2(16., 41.); float sd = length(max(d, 0.)) + min(max(d.x, d.y), 0.); a = cov(-sd);',
    '    if (a > 0.) { float ny = clamp(y / 41., -.98, .98); n = vec3(0., ny, sqrt(1. - ny * ny)); col = iron(qs, n); if (sd > -2.5) col = gold(n); over(acc, col, a); } }',
    // washers and the guard
    '  for (int i = 0; i < 2; i++) { float cx = i == 0 ? 415. : 449.; vec2 d = abs(qs - vec2(cx, 0.)) - vec2(3., 62.); float sd = length(max(d, 0.)) + min(max(d.x, d.y), 0.); a = cov(-sd);',
    '    if (a > 0.) over(acc, gold(normalize(vec3(sign(x - cx) * .5, y / 80., 1.))), a); }',
    '  { vec2 d = abs(qs - vec2(432., 0.)) - vec2(14., 104.) + 14.; float sd = length(max(d, 0.)) + min(max(d.x, d.y), 0.) - 14.; a = cov(-sd);',
    '    if (a > 0.) { float e = clamp(-sd / 6., 0., 1.); n = normalize(vec3(sign(x - 432.) * (1. - e) * .8, sign(y) * (1. - e) * .8 * step(80., abs(y)), 1.));',
    '      col = iron(qs, n); if (sd > -3.6) col = gold(normalize(n + vec3(0., 0., .2))); over(acc, col, a); } }',
    // the blade
    '  if (x > 446. && x < 1970.) {',
    '    float k = clamp((x - 450.) / 1410., 0., 1.), ys = -30. - k * 10., ye = 30. - k * 14.;',
    '    if (x > 1860.) { float w = (x - 1860.) / 106.; ys = -40. + 14. * pow(w, 2.5); ye = 16. - 42. * pow(w, 1.6); }',
    '    a = cov(y - ys) * cov(ye - y) * cov(x - 450.) * cov(1966. - x);',
    '    if (a > 0.) {',
    '      float v = clamp((y - ys) / (ye - ys), 0., 1.), dT;',
    '      if (v < .3) dT = 1.25 - 2.4 * v; else { float w = (v - .3) / .7; dT = (-.65 - .7 * w) / .7; }',
    '      n = normalize(vec3(0., -.3 * dT, 1.));',
    '      n = normalize(mix(n, normalize(vec3(0., -1.1, 1.)), smoothstep(.06, .0, v)));',
    '      n = normalize(n + vec3(.18 * exp(-pow((x - 1860.) / 3., 2.)), 0., 0.));',
    '      vec3 r = mirror(n); vec3 rf = env(r);',
    '      col = rf * vec3(.93, .95, .985) * .93;',
    '      col *= 1. + (fbm(vec2(x * .014, v * 7.)) - .5) * .09;',
    '      col += (hash(vec2(floor(y * 3.), 0.)) - .5) * .02;',
    '      float hl = .70 + .045 * sin(x * .032 + 1.3) + .022 * sin(x * .091) + (noise(vec2(x * .05, 3.)) - .5) * .05;',
    '      if (x > 1860.) hl = mix(hl, .55, (x - 1860.) / 106.);',
    '      float ha = smoothstep(hl - .035, hl + .012, v);',
    '      float mist = fbm(vec2(x * .06, v * 18.));',
    '      col = mix(col, vec3(.88, .9, .93) * (.8 + .2 * rf.r), (.32 + .18 * mist) * ha);',
    '      col += vec3(1.) * exp(-pow((v - hl) / .035, 2.)) * .09 * (.6 + .8 * mist);',
    '      col += vec3(.9) * step(.986, hash(floor(qs * 1.6))) * ha * .45;',
    '      col = mix(col, vec3(.98), smoothstep(.972, .996, v) * .85);',
    // the name, inlaid in gold (kinzogan): cut into the steel, filled with gold, polished flush; the gold takes the same
    // reflections as the steel, and a fine dark line runs round each letter where the gold meets the cut
    '      if (uMarkA > .001) { vec2 mt = (qs - uMarkR.xy) / uMarkR.zw;',
    '        if (mt.x > 0. && mt.x < 1. && mt.y > 0. && mt.y < 1.) { vec2 px1 = 1. / vec2(1024., 160.);',
    '          float m0 = texture2D(uMark, mt).a, mx = (texture2D(uMark, mt + vec2(px1.x * 1.5, 0.)).a - m0) * 2., my = (texture2D(uMark, mt + vec2(0., px1.y * 1.5)).a - m0) * 2.;',
    '          vec3 ng = normalize(n + vec3(-mx, -my, 0.) * .9); float el = dot(env(mirror(ng)), vec3(.3, .5, .2)); vec3 gc = mix(vec3(.42, .25, .06), vec3(1., .78, .36), smoothstep(.1, .95, el)) + vec3(1., .9, .6) * pow(max(el - .7, 0.), 2.) * 1.2;',
    '          float eg = clamp(length(vec2(mx, my)) * 1.6, 0., 1.); col *= 1. - .78 * eg * (1. - m0 * .5) * uMarkA; col = mix(col, gc, m0 * uMarkA); } }',
    '      col += vec3(1.) * exp(-pow((x - uGlint) / 26., 2.)) * .85 * smoothstep(.3, .45, v);',
    '      vec2 sd = qs - uSpark.xy; col += vec3(1., .5, .16) * uSpark.z * exp(-dot(sd, sd) / (2. * 85. * 85.)) * (.55 + .6 * rf.r);',
    '      over(acc, col, a);',
    // the gold collar on the blade
    '      if (x < 506.) { vec2 d = abs(qs - vec2(477., 0.)) - vec2(27., 33.); float sd2 = length(max(d, 0.)) + min(max(d.x, d.y), 0.); float a2 = cov(-sd2);',
    '        if (a2 > 0.) { float ny = clamp(y / 33., -.98, .98); vec3 nh = normalize(vec3(-.2 * step(500., x), ny, sqrt(1. - ny * ny))); vec3 cg = gold(nh) * (.97 + .03 * sin((x + y) * 2.4)); over(acc, cg, a2); } }',
    '    } }',
    // the scabbard: lacquer
    '  if (uSayaA > .005) { float x0 = 455. + uSaya, x1 = 1998. + uSaya;',
    '    if (q.x > x0 - 2. && q.x < x1 + 2.) { float t = clamp((q.x - x0) / 1543., 0., 1.), r = 42. - t * 4.;',
    '      float cap = q.x > x1 - 40. ? sqrt(max(0., 1. - pow((q.x - (x1 - 40.)) / 40., 2.))) : 1.; float rr = r * cap;',
    '      a = cov(rr - abs(q.y + t * 3.)) * cov(q.x - x0) * uSayaA;',
    '      if (a > 0.) { float ny = clamp((q.y + t * 3.) / max(rr, 1.), -.985, .985); n = vec3(0., ny, sqrt(1. - ny * ny));',
    '        vec3 r2 = mirror(n), rf = env(r2); float F = .045 + .95 * pow(1. - n.z, 5.), up = -r2.y;',
    '        col = vec3(.03, .02, .024) * (.6 + .5 * max(dot(n, L), 0.)) + rf * (F * .9 + .035);',
    '        col += vec3(1.) * smoothstep(.50, .58, up) * (1. - smoothstep(.86, .95, up)) * .5;',
    '        col += vec3(.08, .06, .07) * (noise(q * .08) - .5);',
    '        vec2 sd = q - uSpark.xy; col += vec3(1., .5, .16) * uSpark.z * exp(-dot(sd, sd) / (2. * 70. * 70.)) * .35;',
    '        if (q.x < x0 + 18. || q.x > x1 - 46.) col = gold(n);',
    '        over(acc, col, a); } } }',
    '  gl_FragColor = acc * uAlpha;',
    '}'].join('\n');

  window.KatanaGL = function (cv) {
    var gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }) || cv.getContext('experimental-webgl');
    if (!gl) return { ok: false };
    // compiled in the background where the browser can (asking for the result at once would freeze the page while it is
    // built); ready() says when it can draw, and the page waits for it before the opener starts
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var fs = sh(gl.FRAGMENT_SHADER, FS), pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, fs); gl.linkProgram(pr);
    var PAR = gl.getExtension('KHR_parallel_shader_compile'), done = false, failed = false, U = {};
    var asked = 0;
    function ready() {
      if (done || failed) return done;
      var now = performance.now(); if (now - asked < 90) return false; asked = now;
      if (PAR && !gl.getProgramParameter(pr, PAR.COMPLETION_STATUS_KHR)) return false;
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { failed = true; console.error(gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(pr)); return false; }
      gl.useProgram(pr);
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uRes', 'uDpr', 'uS', 'uO', 'uSaya', 'uSayaA', 'uSw', 'uGlint', 'uSpark', 'uEnv', 'uAlpha', 'uMark', 'uMarkR', 'uMarkA', 'uFlip'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
      done = true; return true;
    }
    ready.failed = function () { return failed; };
    var dpr = 1;
    function size(w, h, d) { dpr = d; cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.width = w + 'px'; cv.style.height = h + 'px'; gl.viewport(0, 0, cv.width, cv.height); }
    function draw(u) {
      if (!ready()) return false;
      gl.uniform2f(U.uRes, cv.width / dpr, cv.height / dpr); gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uS, u.s); gl.uniform2f(U.uO, u.ox, u.oy); gl.uniform1f(U.uSaya, u.saya); gl.uniform1f(U.uSayaA, u.sayaA);
      gl.uniform3f(U.uSw, u.sw[0], u.sw[1], u.sw[2]); gl.uniform1f(U.uGlint, u.glint); gl.uniform3f(U.uSpark, u.spark[0], u.spark[1], u.spark[2]);
      gl.uniform1f(U.uFlip, u.flip || 1); gl.uniform1f(U.uEnv, u.env || 0); gl.uniform1f(U.uAlpha, u.alpha == null ? 1 : u.alpha);
      gl.uniform1i(U.uMark, 0); gl.uniform4f(U.uMarkR, MR[0], MR[1], MR[2], MR[3]); gl.uniform1f(U.uMarkA, tex ? (u.markA == null ? 1 : u.markA) : 0);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); return true;
    }
    // the inscription: a canvas (white on clear, 1024 x 160) laid on the blade at rect r = [x, y, w, h] in sword units
    var tex = null, MR = [0, 0, 1, 1];
    function mark(c, r) {
      tex = tex || gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      MR = r;
    }
    return { ok: true, size: size, draw: draw, mark: mark, ready: ready };
  };
})();
