/* Hemlig tomte – shared logic: drawing and link tokens. No DOM access here. */
(function (root) {
  'use strict';

  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function normEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  /**
   * people: [{ id, lastYear? }]  (id = normalized email, lastYear = id of last year's receiver)
   * exclusions: [[idA, idB], ...]  symmetric
   * returns { ok: true, assignment: { giverId: receiverId } } or { ok: false, reason }
   */
  function draw(people, exclusions, rng) {
    rng = rng || Math.random;
    var ids = people.map(function (p) { return p.id; });
    if (ids.length < 2) return { ok: false, reason: 'too-few' };

    var forbidden = {};
    function ban(a, b) { forbidden[a + '\u0000' + b] = true; }
    function banned(a, b) { return forbidden[a + '\u0000' + b] === true; }
    people.forEach(function (p) {
      ban(p.id, p.id);
      if (p.lastYear) ban(p.id, p.lastYear);
    });
    (exclusions || []).forEach(function (pair) { ban(pair[0], pair[1]); ban(pair[1], pair[0]); });

    // 1) Uniform: rejection-sample random permutations.
    for (var attempt = 0; attempt < 5000; attempt++) {
      var perm = shuffle(ids, rng);
      var valid = true;
      for (var k = 0; k < ids.length; k++) {
        if (banned(ids[k], perm[k])) { valid = false; break; }
      }
      if (valid) {
        var res = {};
        ids.forEach(function (id, i) { res[id] = perm[i]; });
        return { ok: true, assignment: res };
      }
    }

    // 2) Tight constraints: randomized backtracking decides whether any solution exists.
    var givers = shuffle(ids, rng);
    var used = {};
    var result = {};
    var steps = 0;
    function bt(i) {
      if (i === givers.length) return true;
      if (++steps > 500000) throw new Error('search-limit');
      var g = givers[i];
      var cands = shuffle(ids, rng);
      for (var c = 0; c < cands.length; c++) {
        var r = cands[c];
        if (used[r] || banned(g, r)) continue;
        used[r] = true; result[g] = r;
        if (bt(i + 1)) return true;
        used[r] = false; delete result[g];
      }
      return false;
    }
    try {
      if (bt(0)) return { ok: true, assignment: result };
    } catch (e) {
      return { ok: false, reason: 'impossible' };
    }
    return { ok: false, reason: 'impossible' };
  }

  // ---- Link tokens (browser only: needs TextEncoder + crypto) ----
  var KEY_LEN = 8;

  function toB64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64url(str) {
    var s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function scramble(data, key) {
    var out = new Uint8Array(data.length);
    for (var i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % KEY_LEN] ^ ((i * 73 + 41) & 255);
    return out;
  }

  /** payload: { g: giverName, r: receiverName, y: year } */
  function encodeToken(payload) {
    var data = new TextEncoder().encode(JSON.stringify(payload));
    var key = crypto.getRandomValues(new Uint8Array(KEY_LEN));
    var body = scramble(data, key);
    var out = new Uint8Array(KEY_LEN + body.length);
    out.set(key, 0); out.set(body, KEY_LEN);
    return toB64url(out);
  }

  /** returns payload or null if the token is malformed */
  function decodeToken(token) {
    try {
      var bytes = fromB64url(String(token || '').trim());
      if (bytes.length <= KEY_LEN) return null;
      var key = bytes.slice(0, KEY_LEN);
      var data = scramble(bytes.slice(KEY_LEN), key);
      var obj = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
      if (!obj || typeof obj.g !== 'string' || typeof obj.r !== 'string' || typeof obj.y !== 'number') return null;
      return obj;
    } catch (e) {
      return null;
    }
  }

  /** Julafton 15:00 Swedish time (CET, UTC+1) for the given year. */
  function christmasEve(year) {
    return new Date(Date.UTC(year, 11, 24, 14, 0, 0));
  }

  root.Tomte = {
    shuffle: shuffle,
    normEmail: normEmail,
    draw: draw,
    encodeToken: encodeToken,
    decodeToken: decodeToken,
    christmasEve: christmasEve
  };
})(typeof window !== 'undefined' ? window : this);
