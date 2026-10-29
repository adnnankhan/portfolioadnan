/* Headline: the two italic words are typed out in pairs — mean/type, feel/tap, need/click, want/say —
   one pair every 3.4 seconds. The first word is deleted and retyped, then the second. Off with reduced motion.
   The full sentence for screen readers is a separate hidden span in the HTML, so it never changes. */
(function () {
  var PAIRS = [['mean', 'type'], ['feel', 'tap'], ['need', 'click'], ['want', 'say']], idx = 0;
  function retype(slot, word) {
    var old = slot.querySelector('i');
    if (!old || old.textContent === word) return;
    var h1 = slot.closest("h1"); if (h1) { h1.classList.add("typing"); clearTimeout(h1._tt); }
    var s = old.textContent, n = s.length, t = setInterval(function () {
      n--; old.textContent = s.slice(0, Math.max(0, n));
      if (n <= 0) { clearInterval(t); var k = 0, t2 = setInterval(function () { k++; old.textContent = word.slice(0, k); if (k >= word.length) { clearInterval(t2); if (h1 && slot.getAttribute("data-w") === "b") h1._tt = setTimeout(function () { h1.classList.remove("typing"); }, 900); } }, 70); }
    }, 45);
  }
  setInterval(function () {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    idx = (idx + 1) % PAIRS.length;
    document.querySelectorAll('.hero [data-rot]').forEach(function (h) {
      var a = h.querySelector('[data-w="a"]'), b = h.querySelector('[data-w="b"]');
      retype(a, PAIRS[idx][0]); setTimeout(function () { retype(b, PAIRS[idx][1]); }, 520);
    });
  }, 3400);
})();
