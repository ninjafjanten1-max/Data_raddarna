(function () {
  'use strict';

  var root = document.documentElement;
  var fx = root.classList.contains('fx');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Reglaget: växla till den vanliga sidan
  var toggle = $('.iem');
  if (toggle) {
    toggle.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      toggle.classList.toggle('flip');
      setTimeout(function () { location.href = toggle.href; }, fx ? 380 : 0);
    });
  }

  if (!fx) return; // Minskad rörelse: statisk version

  /* ---------- Rubriken delas upp i bokstäver ---------- */
  var h1 = $('[data-split]');
  if (h1) {
    var text = h1.textContent.trim();
    h1.setAttribute('aria-label', text);
    h1.textContent = '';
    var n = 0;
    var words = text.split(' ');
    words.forEach(function (word, wi) {
      var w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      Array.from(word).forEach(function (ch) {
        var l = document.createElement('span');
        l.className = 'l';
        l.textContent = ch;
        l.style.setProperty('--i', n++);
        w.appendChild(l);
      });
      h1.appendChild(w);
      if (wi < words.length - 1) h1.appendChild(document.createTextNode(' '));
    });
  }

  /* ---------- Stjärnfält som flyger mot dig ---------- */
  var cv = $('#warp');
  var g = cv.getContext('2d');
  var W, H, D;
  var COLORS = ['#4DB2FF', '#38D6FF', '#1473E6', '#EAF4FF'];
  var pts = [];

  function seed(p, far) {
    p.x = (Math.random() - 0.5) * 2;
    p.y = (Math.random() - 0.5) * 2;
    p.z = far ? 1 : Math.random();
    p.c = COLORS[(Math.random() * COLORS.length) | 0];
    p.s = Math.random() * 0.6 + 0.7;
  }
  function resize() {
    D = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = Math.floor(innerWidth * D);
    H = cv.height = Math.floor(innerHeight * D);
    measure();
  }
  var N = innerWidth < 700 ? 110 : 240;
  for (var i = 0; i < N; i++) { var p = {}; seed(p, false); pts.push(p); }

  /* ---------- Positioner som inte påverkas av transformer ---------- */
  function pageTop(el) {
    var t = 0;
    while (el) { t += el.offsetTop; el = el.offsetParent; }
    return t;
  }

  var rises = $$('.rise');
  var cards = $$('.card');
  var steps = $$('.step');
  var tunnel = $('.tunnel');
  var chip = $('.chip-section');
  var cube = $('.cube');
  var core = $('.core');
  var heroCopy = $('.hero-copy');
  var logo = $('.logo3d');
  var glow = $('.glow');
  var bar = $('.progress');
  var docTop = {};

  function measure() {
    docTop.rises = rises.map(pageTop);
    docTop.cards = cards.map(pageTop);
    docTop.tunnel = tunnel ? pageTop(tunnel) : 0;
    docTop.chip = chip ? pageTop(chip) : 0;
  }

  /* ---------- Pekare ---------- */
  var tx = 0, ty = 0, mx = 0, my = 0, gx = -999, gy = -999;
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
    gx = e.clientX - 260;
    gy = e.clientY - 260;
  }, { passive: true });

  function tilt(el, strength) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', ((px - 0.5) * strength).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-(py - 0.5) * strength).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      el.style.setProperty('--go', '1');
    });
    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--go', '0');
    });
  }
  $$('.card-in').forEach(function (el) { tilt(el, 18); });
  var panel = $('.panel');
  if (panel) tilt(panel, 8);

  /* ---------- Huvudloop ---------- */
  var lastY = scrollY, vel = 0;

  function frame() {
    var y = window.scrollY;
    var vh = innerHeight;
    var dy = y - lastY;
    lastY = y;
    vel += (Math.min(Math.abs(dy), 90) - vel) * 0.12;
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;

    // Framsteg i sidan
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    bar.style.setProperty('--prog', clamp(y / max, 0, 1).toFixed(4));

    // Ljus som följer pekaren
    glow.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';

    // Stjärnfältet
    var speed = 0.0018 + vel * 0.00045;
    var f = W * 0.18;
    g.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var z0 = p.z;
      p.z -= speed * (0.6 + p.s * 0.6);
      if (p.z <= 0.02) { seed(p, true); continue; }
      var sx = W / 2 + (p.x / p.z) * f;
      var sy = H / 2 + (p.y / p.z) * f;
      if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) { seed(p, true); continue; }
      var size = (1 - p.z) * 9 * D * p.s + 1.2 * D;
      g.globalAlpha = (1 - p.z) * 0.9;
      if (vel > 6) {
        var zp = Math.min(1, p.z + speed * 7);
        g.strokeStyle = p.c;
        g.lineWidth = size * 0.6;
        g.beginPath();
        g.moveTo(W / 2 + (p.x / zp) * f, H / 2 + (p.y / zp) * f);
        g.lineTo(sx, sy);
        g.stroke();
      } else {
        g.fillStyle = p.c;
        g.fillRect(sx - size / 2, sy - size / 2, size, size);
      }
    }
    g.globalAlpha = 1;

    // Startsidan: loggan snurrar bort när du skrollar
    var hp = clamp(y / (vh * 0.9), 0, 1);
    if (heroCopy) {
      heroCopy.style.transform = 'perspective(1200px) translate3d(0,' + (-hp * 60).toFixed(1) + 'px,' + (-hp * 400).toFixed(1) + 'px) rotateX(' + (hp * 12).toFixed(2) + 'deg)';
      heroCopy.style.opacity = (1 - hp * 1.15).toFixed(3);
    }
    if (logo) {
      logo.style.transform = 'perspective(1100px) rotateY(' + (mx * 16 + hp * 80).toFixed(2) + 'deg) rotateX(' + (-my * 10 + hp * 25).toFixed(2) + 'deg) translateZ(' + (-hp * 500).toFixed(1) + 'px)';
      logo.style.opacity = (1 - hp * 0.9).toFixed(3);
    }

    // Rubriker och text reser sig i 3D
    for (var r = 0; r < rises.length; r++) {
      var rt = docTop.rises[r] - y;
      var t = clamp((vh * 0.95 - rt) / (vh * 0.4), 0, 1);
      var e = 1 - Math.pow(1 - t, 3);
      var el = rises[r];
      el.style.transformOrigin = '50% 100%';
      el.style.opacity = e.toFixed(3);
      el.style.transform = 'perspective(900px) translateY(' + ((1 - e) * 50).toFixed(1) + 'px) rotateX(' + ((1 - e) * 45).toFixed(1) + 'deg)';
    }

    // Korten flyger in från djupet
    for (var c = 0; c < cards.length; c++) {
      var ct = docTop.cards[c] - y;
      var ctt = clamp((vh * 0.98 - ct) / (vh * 0.45), 0, 1);
      var ce = 1 - Math.pow(1 - ctt, 3);
      var dir = c % 2 ? 1 : -1;
      var card = cards[c];
      card.style.opacity = ce.toFixed(3);
      card.style.transform = 'perspective(1000px) translate3d(' + (dir * (1 - ce) * 80).toFixed(1) + 'px,0,' + (-(1 - ce) * 320).toFixed(1) + 'px) rotateX(' + ((1 - ce) * 65).toFixed(1) + 'deg) rotateY(' + (dir * (1 - ce) * 28).toFixed(1) + 'deg)';
    }

    // Kuben (minneschipet) snurrar med skrollen
    if (chip && cube) {
      var q = ((y + vh / 2) - (docTop.chip + chip.offsetHeight / 2)) / vh;
      cube.style.transform = 'rotateX(' + (-20 + q * 260).toFixed(1) + 'deg) rotateY(' + (30 + q * 420).toFixed(1) + 'deg) scale(' + (1 + (1 - Math.min(1, Math.abs(q))) * 0.2).toFixed(3) + ')';
      core.style.transform = 'rotateX(' + (-q * 380).toFixed(1) + 'deg) rotateY(' + (q * 300).toFixed(1) + 'deg)';
    }

    // Stegen: flygning genom tunneln
    if (tunnel && steps.length) {
      var total = Math.max(1, tunnel.offsetHeight - vh);
      var tp = clamp((y - docTop.tunnel) / total, 0, 1);
      var pos = tp * (steps.length - 1);
      for (var s = 0; s < steps.length; s++) {
        var dz = s - pos;
        var side = s % 2 ? 1 : -1;
        var z, x, ry, op;
        if (dz >= 0) {
          z = -dz * 650;
          x = side * dz * 150;
          ry = -side * dz * 25;
          op = clamp(1 - dz * 0.55, 0, 1);
        } else {
          var past = -dz;
          z = past * 900;
          x = -side * past * 650;
          ry = side * past * 40;
          op = clamp(1 - past * 2.2, 0, 1);
        }
        var st = steps[s];
        st.style.opacity = op.toFixed(3);
        st.style.visibility = op <= 0.01 ? 'hidden' : 'visible';
        st.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(1) + 'px,0,' + z.toFixed(1) + 'px) rotateY(' + ry.toFixed(2) + 'deg)';
      }
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('load', measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(document.body);
  resize();
  requestAnimationFrame(frame);
})();
