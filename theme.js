/* MTI: dark only. Late-filled text fix + FX layer (smooth scroll, progress, parallax, header tuck, card spotlight). */
(function () {
  var root = document.documentElement;
  try { localStorage.removeItem('mti-theme'); } catch (e) {}
  root.removeAttribute('data-theme');

  /* Fix for a bug already in the pages: the seat side panel (seats.html) and the project
     lightbox (index/projects) are written AFTER the page's language script runs, so their
     data-en / data-ar text was never filled on first load. Fill any such empty node once parsed. */
  function fillLate() {
    var l = root.lang === 'ar' ? 'ar' : 'en';
    var nodes = document.querySelectorAll('[data-en]');
    for (var i = 0; i < nodes.length; i++) {
      var e = nodes[i];
      if (e.id !== 'h1' && !e.firstChild) { var v = e.getAttribute('data-' + l); if (v != null) e.innerHTML = v; }
    }
  }

  /* FX layer */
  function fx() {
    var reduce = false;
    try { reduce = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}
    if (reduce) return;
    root.classList.add('fx');
    var bar = document.createElement('div'); bar.className = 'mti-progress'; bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var secs = [].filter.call(document.querySelectorAll('.sec'), function (x) { return x.querySelector(':scope > .vb'); });
    var hero = document.getElementById('home'), cur = window.scrollY, tgt = cur, raf = 0, ticking = false, lastY = cur, hid = false;
    var fine = false; try { fine = matchMedia('(pointer:fine)').matches; } catch (e) {}
    function max() { return Math.max(0, root.scrollHeight - window.innerHeight); }
    function paint() {
      var y = window.scrollY, m = max();
      bar.style.transform = 'scaleX(' + (m ? Math.min(1, y / m) : 0) + ')';
      if (hero) {
        var h = hero.offsetHeight || 1, p = Math.min(Math.max(y / h, 0), 1);
        hero.style.setProperty('--hy', (p * h * -0.06).toFixed(1) + 'px');
        hero.style.setProperty('--ho', (1 - p * 0.9).toFixed(3));
      }
      var vh = window.innerHeight;
      for (var i = 0; i < secs.length; i++) {
        var r = secs[i].getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        var q = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        secs[i].style.setProperty('--py', (q * -r.height * 0.045).toFixed(1) + 'px');
      }
      ticking = false;
    }
    function inScrollable(el) {
      while (el && el !== document.body && el.nodeType === 1) {
        var o = getComputedStyle(el).overflowY;
        if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
        el = el.parentNode;
      }
      return false;
    }
    function tick() {
      cur += (tgt - cur) * 0.1;
      if (Math.abs(tgt - cur) < 0.4) { cur = tgt; raf = 0; } else raf = requestAnimationFrame(tick);
      window.scrollTo({ top: cur, behavior: 'instant' });
    }
    if (fine) {
      window.addEventListener('wheel', function (e) {
        if (e.ctrlKey || e.defaultPrevented || document.body.style.overflow === 'hidden' || inScrollable(e.target)) return;
        e.preventDefault();
        var d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
        if (!raf) cur = window.scrollY;
        tgt = Math.min(max(), Math.max(0, tgt + d));
        if (!raf) raf = requestAnimationFrame(tick);
      }, { passive: false });
    }
    window.addEventListener('scroll', function () {
      if (!raf) { cur = tgt = window.scrollY; }
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
      /* header tucks away while reading down, returns on scroll up */
      var y = window.scrollY, hd = document.querySelector('header');
      if (hd) {
        var open = hd.matches(':hover,:focus-within') || document.querySelector('.mnav.on');
        var hide = y > 240 && y > lastY + 2 && !open;
        if (hide !== hid && (hide || y < lastY - 2 || y <= 240)) { hid = hide; root.classList.toggle('nav-hide', hide); }
      }
      lastY = y;
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();

    if (fine) {
      /* soft light that follows the pointer inside cards (the card itself never moves) */
      document.addEventListener('pointermove', function (e) {
        var c = e.target.closest && e.target.closest('.card,.pc,.pcard');
        if (!c) return;
        var sp = c.querySelector(':scope > .mti-spot');
        if (!sp) { sp = document.createElement('i'); sp.className = 'mti-spot'; sp.setAttribute('aria-hidden', 'true'); c.appendChild(sp); }
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }, { passive: true });
    }
  }
  /* Stat numbers count up from zero when they scroll into view. Layout never shifts:
     the figure is zero-padded to its final width while it runs, then the original text is restored. */
  function counters() {
    var els = document.querySelectorAll('dl dd');
    if (!els.length) return;
    var reduce = false;
    try { reduce = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}
    if (reduce) return;
    var items = [];
    for (var i = 0; i < els.length; i++) {
      var t = els[i].textContent.trim(), m = t.match(/^(\D*)([\d,]+)(\D*)$/);
      if (!m) continue;
      var num = parseInt(m[2].replace(/,/g, ''), 10);
      items.push({ el: els[i], pre: m[1], suf: m[3], num: num, len: Math.max(String(num).length, m[2].length), comma: m[2].indexOf(',') > -1, final: t, i: items.length });
    }
    function fmt(it, v) {
      var s = it.comma ? v.toLocaleString('en-US') : String(v);
      if (!it.comma) while (s.length < it.len) s = '0' + s;
      return it.pre + s + it.suf;
    }
    function run(it) {
      var dur = 1900, delay = it.i * 130, t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts + delay;
        var p = Math.min(1, Math.max(0, (ts - t0) / dur));
        var e = 1 - Math.pow(1 - p, 4);
        if (p < 1) { it.el.textContent = fmt(it, Math.round(it.num * e)); requestAnimationFrame(step); }
        else it.el.textContent = it.final;
      }
      requestAnimationFrame(step);
    }
    for (var k = 0; k < items.length; k++) items[k].el.textContent = fmt(items[k], 0);
    if (!('IntersectionObserver' in window)) { items.forEach(function (it) { it.el.textContent = it.final; }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        for (var j = 0; j < items.length; j++) if (items[j].el === e.target) run(items[j]);
      });
    }, { threshold: 0.5 });
    items.forEach(function (it) { io.observe(it.el); });
  }
  /* Background videos: force muted autoplay, retry on first interaction, and fall back to the
     original remote file if the local copy in /media cannot be loaded. */
  function videos() {
    var vs = document.querySelectorAll('video.vb');
    function go(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    for (var i = 0; i < vs.length; i++) (function (v) {
      v.muted = true; v.defaultMuted = true; v.setAttribute('playsinline', '');
      var tried = false;
      v.addEventListener('error', function () {
        if (tried) return; tried = true;
        var f = (v.getAttribute('src') || '').split('/').pop();
        if (f) { v.src = 'https://hirael.com/media/templates/prism/' + f; v.load(); go(v); }
      });
      go(v);
    })(vs[i]);
    function kick() { for (var j = 0; j < vs.length; j++) if (vs[j].paused) go(vs[j]); }
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (t) { addEventListener(t, kick, { once: true, passive: true }); });
  }
  function init() { fillLate(); fx(); counters(); videos(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
