var cga = require('./cga.js');
var cgaparser = require('./cgaparser.js');

function t(e) {
  try {
    console.log("Doing", e);
    var r = cgaparser.parse(e);
    console.dir(r, { depth: null });
  } catch (e) {
    console.error(e);
    console.log(e.location);

  }
}

t('attr a = 2\nattr b = 3\n');
t('Lot --> Cake\n');
t('Lot --> Cake s(3.4)\n');
t('Lot --> Cake s(3)\n');
t('Lot --> Cake s(\'3)\n');
t('Lot --> Cake s(\'3.4)\n');

t('Lot --> s(\'rand(0.2,1.5), \'rand(0.2, 1.5), \'rand(0.2, 1.5))\n');

t('Lot --> split(y) { 4 : Floor }\n');
t('Lot --> split(y) { 4 : Floor }*\n');

t('Lot --> split(y) { 4 : Floor | 3: Floor }*\n');


t('Lot --> Cake\nCake --> s(3.4)');
t('Lot --> s(3.4) Cake\nCake --> s(3.4)');
t('Lot --> split(y) { 1: Cake }\nCake --> s(3.4)');

t('Lot --> set(material.color, "red")')
