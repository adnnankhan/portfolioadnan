/* Headline: the two italic words are typed out in pairs — mean/type, feel/tap, need/click, want/say —
   one pair every 3.4 seconds. The first word is deleted and retyped, then the second. It plays the round once and
   finishes where it began, on the full sentence "…what people mean, not what they type." (7 Nov 2026). Off with reduced
   motion: the full sentence, at once (also if reduced motion is turned on part way).
   The full sentence for screen readers is a separate hidden span in the HTML, so it never changes. */
(function () {
  var PAIRS = [['mean', 'type'], ['feel', 'tap'], ['need', 'click'], ['want', 'say']], idx = 0, timers = [];
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function later(fn, ms, every) { var t = every ? setInterval(fn, ms) : setTimeout(fn, ms); timers.push(t); return t; }
  function retype(slot, word) {
    var old = slot.querySelector('i');
    if (!old || old.textContent === word) return;
    var h1 = slot.closest("h1"); if (h1) { h1.classList.add("typing"); clearTimeout(h1._tt); }
    var s = old.textContent, n = s.length, t = later(function () {
      n--; old.textContent = s.slice(0, Math.max(0, n));
      if (n <= 0) { clearInterval(t); var k = 0, t2 = later(function () { k++; old.textContent = word.slice(0, k); if (k >= word.length) { clearInterval(t2); if (h1 && slot.getAttribute("data-w") === "b") h1._tt = setTimeout(function () { h1.classList.remove("typing"); }, 900); } }, 70, true); }
    }, 45, true);
  }
  // the full sentence, at once: every timer stopped, both words back to the first pair
  function settle() {
    timers.forEach(function (t) { clearInterval(t); clearTimeout(t); }); timers = []; idx = 0;
    document.querySelectorAll('.hero [data-rot]').forEach(function (h) {
      h.classList.remove('typing');
      [['a', 0], ['b', 1]].forEach(function (p) { var i = h.querySelector('[data-w="' + p[0] + '"] i'); if (i) i.textContent = PAIRS[0][p[1]]; });
    });
  }
  if (mq && mq.matches) return;
  if (mq) { var onChange = function () { if (mq.matches) settle(); }; if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange); }
  var round = later(function () {
    idx = (idx + 1) % PAIRS.length;
    var pair = PAIRS[idx];
    document.querySelectorAll('.hero [data-rot]').forEach(function (h) {
      var a = h.querySelector('[data-w="a"]'), b = h.querySelector('[data-w="b"]');
      retype(a, pair[0]); later(function () { retype(b, pair[1]); }, 520);
    });
    if (idx === 0) clearInterval(round);   // back to the first pair: the round is done and the sentence stays
  }, 3400, true);
})();
