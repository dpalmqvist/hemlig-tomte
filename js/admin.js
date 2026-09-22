/* Admin page: participants, exclusions, last year, draw, links, export/import. */
(function () {
  'use strict';
  var STORE_KEY = 'hemlig-tomte-admin-v1';
  var MAX_SEK = 500;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- state ----------
  var state = load() || {
    year: new Date().getFullYear(),
    baseUrl: defaultBaseUrl(),
    people: [],       // [{ name, email, lastYear }]  email is normalized; lastYear is an email or ''
    exclusions: [],   // [[emailA, emailB]]
    draw: null        // { signature, drawnAt, assignment: {email: email}, links: {email: url} }
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep going */ }
  }
  function defaultBaseUrl() {
    var u = location.href.split('#')[0].split('?')[0];
    return u.replace(/[^/]*$/, '') + 'index.html';
  }
  function byEmail(email) {
    for (var i = 0; i < state.people.length; i++) if (state.people[i].email === email) return state.people[i];
    return null;
  }
  function nameOf(email) { var p = byEmail(email); return p ? p.name : email; }

  /** Anything that changes who can draw whom invalidates an existing draw. */
  function signature() {
    return JSON.stringify({
      y: state.year,
      p: state.people.map(function (p) { return [p.name, p.email, p.lastYear || '']; }),
      e: state.exclusions.map(function (e) { return e.slice().sort(); }).sort()
    });
  }

  function setMsg(id, text, kind) {
    var el = $(id);
    el.className = 'msg' + (kind ? ' ' + kind : '');
    el.textContent = text || '';
  }

  // ---------- participants ----------
  $('addForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('newName').value.trim().replace(/\s+/g, ' ');
    var email = Tomte.normEmail($('newEmail').value);
    if (!name) return setMsg('addMsg', 'Skriv ett namn.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMsg('addMsg', 'Det där ser inte ut som en e-postadress.', 'error');
    if (byEmail(email)) return setMsg('addMsg', email + ' finns redan med.', 'error');
    state.people.push({ name: name, email: email, lastYear: '' });
    $('newName').value = ''; $('newEmail').value = '';
    $('newName').focus();
    setMsg('addMsg', '');
    commit();
  });

  function removePerson(email) {
    state.people = state.people.filter(function (p) { return p.email !== email; });
    state.people.forEach(function (p) { if (p.lastYear === email) p.lastYear = ''; });
    state.exclusions = state.exclusions.filter(function (e) { return e[0] !== email && e[1] !== email; });
    commit();
  }

  function renderPeople() {
    var body = $('peopleBody');
    body.textContent = '';
    $('peopleEmpty').hidden = state.people.length > 0;
    state.people.forEach(function (p) {
      var tr = document.createElement('tr');
      var tdName = document.createElement('td'); tdName.textContent = p.name;
      var tdEmail = document.createElement('td'); tdEmail.className = 'email'; tdEmail.textContent = p.email;
      var tdLast = document.createElement('td');
      var sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Vem ' + p.name + ' köpte till förra året');
      sel.appendChild(new Option('– ingen / okänt –', ''));
      state.people.forEach(function (o) { if (o.email !== p.email) sel.appendChild(new Option(o.name, o.email)); });
      sel.value = p.lastYear || '';
      sel.addEventListener('change', function () { p.lastYear = sel.value; commit(); });
      tdLast.appendChild(sel);
      var tdDel = document.createElement('td');
      var del = document.createElement('button');
      del.type = 'button'; del.className = 'btn icon'; del.textContent = '🗑️';
      del.setAttribute('aria-label', 'Ta bort ' + p.name);
      del.addEventListener('click', function () { removePerson(p.email); });
      tdDel.appendChild(del);
      tr.append(tdName, tdEmail, tdLast, tdDel);
      body.appendChild(tr);
    });
  }

  // ---------- exclusions ----------
  $('addEx').addEventListener('click', function () {
    var a = $('exA').value, b = $('exB').value;
    if (!a || !b) return setMsg('exMsg', 'Lägg till minst två deltagare först.', 'error');
    if (a === b) return setMsg('exMsg', 'Välj två olika personer.', 'error');
    var exists = state.exclusions.some(function (e) { return (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a); });
    if (exists) return setMsg('exMsg', 'Det undantaget finns redan.', 'error');
    state.exclusions.push([a, b]);
    setMsg('exMsg', '');
    commit();
  });

  function renderExclusions() {
    ['exA', 'exB'].forEach(function (id, idx) {
      var sel = $(id), prev = sel.value;
      sel.textContent = '';
      state.people.forEach(function (p) { sel.appendChild(new Option(p.name, p.email)); });
      if (byEmail(prev)) sel.value = prev;
      else if (state.people[idx]) sel.value = state.people[idx].email;
    });
    var list = $('exList');
    list.textContent = '';
    state.exclusions.forEach(function (e, i) {
      var chip = document.createElement('span'); chip.className = 'chip';
      chip.appendChild(document.createTextNode(nameOf(e[0]) + ' ⇄ ' + nameOf(e[1])));
      var x = document.createElement('button');
      x.type = 'button'; x.textContent = '×';
      x.setAttribute('aria-label', 'Ta bort undantaget ' + nameOf(e[0]) + ' och ' + nameOf(e[1]));
      x.addEventListener('click', function () { state.exclusions.splice(i, 1); commit(); });
      chip.appendChild(x);
      list.appendChild(chip);
    });
  }

  // ---------- import last year ----------
  $('importFile').addEventListener('change', function () {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(reader.result); } catch (e) { data = null; }
      if (!data || !Array.isArray(data.assignments)) {
        return setMsg('importMsg', 'Filen gick inte att läsa. Välj en fil som exporterats härifrån.', 'error');
      }
      var added = 0, matched = 0;
      (data.participants || []).forEach(function (p) {
        var email = Tomte.normEmail(p && p.email);
        var name = String((p && p.name) || '').trim();
        if (email && name && !byEmail(email)) { state.people.push({ name: name, email: email, lastYear: '' }); added++; }
      });
      data.assignments.forEach(function (a) {
        var giver = byEmail(Tomte.normEmail(a && a.giver));
        var recv = Tomte.normEmail(a && a.receiver);
        if (giver && byEmail(recv) && recv !== giver.email) { giver.lastYear = recv; matched++; }
      });
      commit();
      setMsg('importMsg', 'Importerade lottningen från ' + (data.year || 'förra året') + ': ' + matched +
        ' kopplingar' + (added ? ', ' + added + ' nya deltagare' : '') + '.', 'ok');
    };
    reader.readAsText(file);
  });

  // ---------- draw ----------
  $('year').addEventListener('change', function () {
    var y = parseInt(this.value, 10);
    if (y >= 2000 && y <= 2100) { state.year = y; commit(); } else this.value = state.year;
  });
  $('baseUrl').addEventListener('change', function () {
    state.baseUrl = this.value.trim() || defaultBaseUrl();
    // Links embed the base URL, so regenerate them for the existing draw.
    if (state.draw) state.draw.links = makeLinks(state.draw.assignment);
    commit();
  });

  function makeLinks(assignment) {
    var links = {};
    Object.keys(assignment).forEach(function (g) {
      var token = Tomte.encodeToken({ g: nameOf(g), r: nameOf(assignment[g]), y: state.year });
      links[g] = state.baseUrl.split('#')[0] + '#' + token;
    });
    return links;
  }

  $('drawBtn').addEventListener('click', function () {
    if (state.draw && !confirmRedraw()) return;
    var res = Tomte.draw(
      state.people.map(function (p) { return { id: p.email, lastYear: p.lastYear || '' }; }),
      state.exclusions
    );
    if (!res.ok) {
      state.draw = null;
      commit();
      return setMsg('drawMsg', res.reason === 'too-few'
        ? 'Det behövs minst två deltagare för att dra lotter.'
        : 'Det går inte att dra en lottning med de här reglerna. Ta bort något undantag eller någon "förra året"-koppling och försök igen.', 'error');
    }
    state.draw = {
      signature: signature(),
      drawnAt: new Date().toISOString(),
      assignment: res.assignment,
      links: makeLinks(res.assignment)
    };
    $('showSecret').checked = false;
    commit();
    setMsg('drawMsg', 'Klart! Lottningen är dragen 🎉 Skicka länkarna nedan.', 'ok');
    $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  var redrawArmed = false;
  function confirmRedraw() {
    // Two-click confirm instead of a modal dialog.
    if (redrawArmed) { redrawArmed = false; $('drawBtn').textContent = '🎲 Dra lottning'; return true; }
    redrawArmed = true;
    $('drawBtn').textContent = '⚠️ Klicka igen för att dra om (gamla länkar slutar gälla)';
    setTimeout(function () { redrawArmed = false; $('drawBtn').textContent = '🎲 Dra lottning'; }, 5000);
    return false;
  }

  // ---------- results ----------
  function mailto(p, link) {
    var subject = 'Hemlig tomte ' + state.year + ' 🎅';
    var body = 'Hej ' + p.name + '!\n\n' +
      'Lottningen till årets hemliga tomte är klar. Klicka på länken för att se vem du ska köpa julklapp till:\n\n' +
      link + '\n\n' +
      'Max ' + MAX_SEK + ' kr. Håll det hemligt och dela inte länken!\n\nGod jul! 🎄';
    return 'mailto:' + encodeURIComponent(p.email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function copy(text, label) {
    var done = function () { setMsg('resultMsg', 'Länken till ' + label + ' är kopierad.', 'ok'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function renderResults() {
    var d = state.draw;
    $('resultCard').hidden = !d;
    if (!d) return;
    var stale = d.signature !== signature();
    setMsg('staleMsg', stale ? 'Deltagare eller regler har ändrats sedan lottningen. Dra en ny lottning innan du skickar länkarna.' : '', stale ? 'warn' : '');
    var show = $('showSecret').checked;
    var body = $('resultBody');
    body.textContent = '';
    state.people.forEach(function (p) {
      var link = d.links[p.email];
      var tr = document.createElement('tr');
      var tdName = document.createElement('td'); tdName.textContent = p.name;
      var tdRecv = document.createElement('td');
      if (!link) { tdRecv.textContent = '– ej med i lottningen –'; tdRecv.className = 'secret'; }
      else if (show) tdRecv.textContent = nameOf(d.assignment[p.email]);
      else { tdRecv.textContent = '●●●●●'; tdRecv.className = 'secret'; }
      var tdLink = document.createElement('td');
      var tdAct = document.createElement('td');
      if (link) {
        var inp = document.createElement('input');
        inp.type = 'text'; inp.readOnly = true; inp.value = link; inp.className = 'link';
        inp.setAttribute('aria-label', 'Länk till ' + p.name);
        inp.addEventListener('focus', function () { inp.select(); });
        tdLink.appendChild(inp);
        var acts = document.createElement('div'); acts.className = 'actions';
        var c = document.createElement('button');
        c.type = 'button'; c.className = 'btn small'; c.textContent = '📋 Kopiera';
        c.addEventListener('click', function () { copy(link, p.name); });
        var m = document.createElement('a');
        m.className = 'btn small primary'; m.textContent = '✉️ Mejla'; m.href = mailto(p, link);
        acts.append(c, m);
        tdAct.appendChild(acts);
      }
      tr.append(tdName, tdRecv, tdLink, tdAct);
      body.appendChild(tr);
    });
  }
  $('showSecret').addEventListener('change', renderResults);

  $('exportBtn').addEventListener('click', function () {
    var d = state.draw;
    if (!d) return;
    var data = {
      app: 'hemlig-tomte', version: 1, year: state.year, drawnAt: d.drawnAt,
      participants: state.people.map(function (p) { return { name: p.name, email: p.email }; }),
      exclusions: state.exclusions,
      assignments: Object.keys(d.assignment).map(function (g) { return { giver: g, receiver: d.assignment[g] }; })
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hemlig-tomte-' + state.year + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  // ---------- render ----------
  function renderSettings() {
    $('year').value = state.year;
    $('baseUrl').value = state.baseUrl;
    var local = /^file:|^https?:\/\/(localhost|127\.0\.0\.1)/.test(state.baseUrl);
    setMsg('urlWarn', local
      ? 'Adressen pekar på din egen dator, så länkarna fungerar bara här. Lägg upp sidan på webben och skriv in den riktiga adressen innan du skickar länkarna.'
      : '', local ? 'warn' : '');
  }
  function commit() { save(); render(); }
  function render() { renderPeople(); renderExclusions(); renderSettings(); renderResults(); }
  render();
})();
