// Run: osascript -l JavaScript tests/draw.test.js   (from the project root)
ObjC.import('Foundation');
function read(p) { return $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null).js; }
eval(read('js/tomte.js'));
var T = this.Tomte;
var fails = [], passes = 0;
function check(name, cond) { if (cond) passes++; else fails.push(name); }

function validPerm(people, excl, a) {
  var ids = people.map(function (p) { return p.id; });
  var recv = {};
  for (var i = 0; i < ids.length; i++) {
    var g = ids[i], r = a[g];
    if (!r || r === g || recv[r]) return false;
    recv[r] = true;
    var p = people[i];
    if (p.lastYear && p.lastYear === r) return false;
    for (var k = 0; k < excl.length; k++) {
      var e = excl[k];
      if ((e[0] === g && e[1] === r) || (e[1] === g && e[0] === r)) return false;
    }
  }
  return Object.keys(a).length === ids.length;
}
function P(ids, last) { return ids.map(function (id) { return { id: id, lastYear: (last || {})[id] }; }); }

// too few
check('one person -> too-few', T.draw(P(['a']), []).reason === 'too-few');
check('zero people -> too-few', T.draw([], []).reason === 'too-few');

// two people: only swap
var r2 = T.draw(P(['a', 'b']), []);
check('two people swap', r2.ok && r2.assignment.a === 'b' && r2.assignment.b === 'a');

// two people excluded -> impossible
check('two excluded -> impossible', T.draw(P(['a', 'b']), [['a', 'b']]).reason === 'impossible');

// many random draws respect all constraints
var ppl = P(['a','b','c','d','e','f','g'], { a: 'b', c: 'd', e: 'a' });
var ex = [['a','c'], ['f','g'], ['b','d']];
var allOk = true;
for (var i = 0; i < 300; i++) { var r = T.draw(ppl, ex); if (!r.ok || !validPerm(ppl, ex, r.assignment)) { allOk = false; break; } }
check('300 constrained draws valid', allOk);

// tight: 3 couples, everyone must go to other couple; last year blocks more -> still solvable via backtracking
var tight = P(['a1','a2','b1','b2','c1','c2']);
var tex = [['a1','a2'],['b1','b2'],['c1','c2']];
var rt = T.draw(tight, tex);
check('couples solvable', rt.ok && validPerm(tight, tex, rt.assignment));

// impossible with 3: a excluded from b and c
check('3 impossible', T.draw(P(['a','b','c']), [['a','b'],['a','c']]).reason === 'impossible');

// last year forces a single 3-cycle direction
var p3 = P(['a','b','c'], { a: 'b' }); // a cannot give to b -> a->c, c->b, b->a
var dist = {};
for (var j = 0; j < 50; j++) { var x = T.draw(p3, []); dist[JSON.stringify(x.assignment)] = true; }
var keys = Object.keys(dist);
check('last year respected (single outcome)', keys.length === 1 && JSON.parse(keys[0]).a === 'c');

// randomness: 4 people unconstrained yields several different outcomes
var seen = {};
for (var m = 0; m < 200; m++) seen[JSON.stringify(T.draw(P(['a','b','c','d']), []).assignment)] = 1;
check('draws vary (9 derangements of 4)', Object.keys(seen).length === 9);

// christmasEve is 15:00 Stockholm (14:00 UTC)
check('christmasEve UTC', T.christmasEve(2026).toISOString() === '2026-12-24T14:00:00.000Z');

check('normEmail', T.normEmail('  Anna@Ex.SE ') === 'anna@ex.se');

(fails.length ? 'FAIL ' + fails.join(', ') + ' | ' : '') + passes + ' passed, ' + fails.length + ' failed';
