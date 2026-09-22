/* Gentle falling snow on a full-screen canvas. */
(function () {
  'use strict';
  var canvas = document.getElementById('snow');
  if (!canvas || !canvas.getContext) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = canvas.getContext('2d');
  var flakes = [];
  var w = 0, h = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = Math.round(Math.min(160, (w * h) / 9000));
    while (flakes.length < target) flakes.push(make(true));
    flakes.length = target;
  }
  function make(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -10,
      r: Math.random() * 2.6 + 0.8,
      vy: Math.random() * 0.7 + 0.35,
      phase: Math.random() * Math.PI * 2,
      sway: Math.random() * 0.6 + 0.2,
      a: Math.random() * 0.5 + 0.45
    };
  }
  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      if (!reduce) {
        f.y += f.vy * (1 + f.r / 3);
        f.x += Math.sin(t / 1400 + f.phase) * f.sway;
        if (f.y > h + 10) { flakes[i] = make(false); continue; }
        if (f.x > w + 10) f.x = -10; else if (f.x < -10) f.x = w + 10;
      }
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + f.a + ')';
      ctx.fill();
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
