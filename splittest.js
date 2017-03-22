var cgaprocessor = require('./cgaprocessor')

function t(sizes, size, repeat) {
  console.log(sizes, size, repeat);
  console.log(cgaprocessor._compute_splits( sizes, size, repeat ));
}

t([ { size: 2 } ], 4, true);
t([ { size: 2 } ], 5, true);
t([ { size: 2 }, { size: 2 } ], 4, true);
t([ { size: 2 }, { size: 2 } ], 5, true);
t([ { size: 2, _float: true }, { size: 2 } ], 3, true);
t([ { size: 2 }, { size: 2, _float: true }, { size: 2 } ], 4.5, true);
t([ { size: 2 }, { size: 1, _float: true }, { size: 2, _float: true }, { size: 2 } ], 4.5, true);
