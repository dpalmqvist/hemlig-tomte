/* Family page: decode the personal link, reveal gift, run the countdown. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var hash = location.hash.replace(/^#/, '');
  var data = hash ? Tomte.decodeToken(hash) : null;

  var now = new Date();
  var year = data ? data.y : now.getFullYear();
  // Past this year's julafton with no link? Count down to next year's.
  if (!data && now > new Date(Tomte.christmasEve(year).getTime() + 24 * 3600 * 1000)) year += 1;
  $('year').textContent = year;

  if (data) {
    $('greeting').innerHTML = 'Hej <strong></strong>! Här är ditt hemliga uppdrag.';
    $('greeting').querySelector('strong').textContent = data.g;
    $('greeting').hidden = false;
    $('receiver').textContent = data.r;
    $('giftZone').hidden = false;
    document.title = 'Hemlig tomte – ' + data.g;

    var gift = $('gift');
    gift.addEventListener('click', function () {
      if (gift.classList.contains('open')) return;
      gift.classList.add('open');
      gift.setAttribute('aria-label', 'Paketet är öppnat');
      $('hint').hidden = true;
      $('reveal').classList.add('show');
      burst($('giftZone'));
    });
  } else {
    $('noLink').hidden = false;
    if (hash) {
      $('noLinkTitle').textContent = 'Hoppsan! Länken fungerar inte 🦌';
      $('noLinkText').textContent = 'Den här länken verkar vara trasig eller ofullständig. Kopiera hela länken från mejlet och försök igen, eller fråga den som ordnar lottningen om en ny.';
    }
  }

  function burst(zone) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var icons = ['✨', '❄️', '⭐', '🎉', '🎄', '💫'];
    for (var i = 0; i < 26; i++) {
      var s = document.createElement('span');
      s.className = 'burst';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = icons[i % icons.length];
      var ang = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
      var dist = 110 + Math.random() * 140;
      s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
      s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 40) + 'px');
      s.style.setProperty('--rot', Math.round(Math.random() * 360 - 180) + 'deg');
      zone.appendChild(s);
      setTimeout(function (el) { el.remove(); }, 1400, s);
    }
  }

  // ---- Countdown ----
  var target = Tomte.christmasEve(year);
  var fmt = new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' });
  $('cdTarget').textContent = 'Julafton, ' + fmt.format(target);

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function tick() {
    var diff = target.getTime() - Date.now();
    if (diff <= 0) {
      $('cdTitle').textContent = 'Det är julafton! God jul! 🎄';
      $('cdD').textContent = $('cdH').textContent = $('cdM').textContent = $('cdS').textContent = '0';
      return;
    }
    var s = Math.floor(diff / 1000);
    $('cdD').textContent = Math.floor(s / 86400);
    $('cdH').textContent = pad(Math.floor((s % 86400) / 3600));
    $('cdM').textContent = pad(Math.floor((s % 3600) / 60));
    $('cdS').textContent = pad(s % 60);
    setTimeout(tick, 1000 - (Date.now() % 1000));
  }
  tick();
})();
