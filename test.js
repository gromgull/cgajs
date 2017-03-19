var cga = require('./cga.js');
var cgaparser = require('./cgaparser.js');

function t(e) {
  try {
    var r = cgaparser.parse(e);
    console.dir(r, { depth: null });
  } catch (e) {
    console.log(e.location);
    console.error(e);
  }
}

t('attr a = 2\nattr b = 3\n');
t('Lot --> Cake\n');
t('Lot --> Cake s(3.4)\n');
t('Lot --> Cake s(3)\n');
t('Lot --> Cake s(\'3)\n');
