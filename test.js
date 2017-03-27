var cga = require('./cga.js');
var cgaparser = require('./cgaparser.js');

function t(g) {
  try {
    console.log("Doing", g);
    var r = cgaparser.parse(g);
    console.dir(r, { depth: null });
  } catch (e) {
    if (e.location) {
      console.log(e.location);
      start = e.location.start;
      console.log(g.split('\n')[start.line-1]);
      console.log(Array(e.location.start.column).join(' ')+'^');
}

    throw e;
  }
}

t('attr a = 2\nattr b = 3\n');

t('Lot --> Cake\n');
t('Lot --> Cake s(3.4)\n');
t('Lot --> Cake s(3)\n');
t('Lot --> Cake s(\'3)\n');
t('Lot --> Cake s(\'3.4)\n');

t('Lot --> s(\'rand(0.2,1.5), \'rand(0.2, 1.5), \'rand(0.2, 1.5))\n');


// split
t('Lot --> split(y) { 4 : Floor }\n');

// split repeat
t('Lot --> split(y) { 4 : Floor }*\n');

// split two
t('Lot --> split(y) { 4 : Floor | 3: Floor }*\n');


// several rules
t('Lot --> Cake\nCake --> s(3.4)');

// several rules w function
t('Lot --> s(3.4) Cake\nCake --> s(3.4)');

// split + several rule
t('Lot --> split(y) { 1: Cake }\nCake --> s(3.4)');

// comp
t('Lot --> comp(f) { front: Cake | back : Cake}');

// attr ref
t('Lot --> set(material.color, "red")');

// stack op
t('Lot --> [ t(1,0,1) Box ] [ t(-1,0,1) Box ] [ t(1,0,-1) Box ]');

// empty parameters
t('Lot --> primitiveCube()');

// stochastic
t('Lot -->\n  20%: A\n  else: B');

// stochastic function, whitespace
t('Lot --> \n  20%: s(1,1,1)\n  else: r(1,1,1)');

// stochastic several
t('Lot --> \n  20%: A\n  else: B\n\nA --> extrude(2)');

// no support for nesting
// t('Lot -->\n  20%: A\n  30%: B\n  else: C');
