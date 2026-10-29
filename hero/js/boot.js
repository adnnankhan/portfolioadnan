/* Boot: starts the hero once fonts are ready, pauses it when it is off screen or the tab is hidden, handles resize,
   and runs the mobile menu. Loaded last. */
(function () {
  'use strict';
  function boot() {
    var U = HX.U, el = document.querySelector('.hero'), it = HX.list[0]; if (!el || !it) return;
    var inst = it.factory(el, U), running = false, visible = true;
    function run(on) { if (on && !running) { inst.start(); running = true; } else if (!on && running) { inst.stop(); running = false; } }
    var ready = false;
    function go() { if (ready) return; ready = true; el.classList.add('on'); run(visible && !document.hidden); }
    // safety net: if the frame rate drops at full sharpness, fall back to a 1x canvas
    if (U.dprMax > 1 && (window.devicePixelRatio || 1) > 1 && !U.reduce) {
      var ts = [], lt = 0;
      (function probe(t) {
        if (lt) ts.push(t - lt); lt = t;
        if (ts.length < 60) { requestAnimationFrame(probe); return; }
        ts.sort(function (a, b) { return a - b; });
        if (ts[30] > 26) { U.dprMax = 1; if (inst.resize) inst.resize(); }
      })(0);
    }
    U.fonts().then(go); setTimeout(go, 1200);
    var rt = 0; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (inst.resize) inst.resize(); }, 160); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (ready) run(visible && !document.hidden); }).observe(el);
    document.addEventListener('visibilitychange', function () { if (ready) run(visible && !document.hidden); });
    // the Menu button (screens up to 1020px wide)
    var mb = el.querySelector('.pl-menu'), nav = el.querySelector('.pl-links');
    if (mb && nav) {
      var set = function (o) { mb.setAttribute('aria-expanded', String(o)); nav.classList.toggle('open', o); };
      mb.addEventListener('click', function () { set(mb.getAttribute('aria-expanded') !== 'true'); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { set(false); mb.focus(); } });
      document.addEventListener('click', function (e) { if (nav.classList.contains('open') && !nav.contains(e.target) && e.target !== mb) set(false); });
      // a link in the open menu closes it (on one page the link only scrolls, so the menu would stay open over the page)
      nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) set(false); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
