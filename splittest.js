var THREE = require('three');
var cgaprocessor = require('./cgaprocessor')

// function t(sizes, size, repeat) {
//   console.log(sizes, size, repeat);
//   console.log(cgaprocessor._compute_splits( sizes, size, repeat ));
// }

// t([ { size: 2 } ], 4, true);
// t([ { size: 2 } ], 5, true);
// t([ { size: 2 }, { size: 2 } ], 4, true);
// t([ { size: 2 }, { size: 2 } ], 5, true);
// t([ { size: 2, _float: true }, { size: 2 } ], 3, true);
// t([ { size: 2 }, { size: 2, _float: true }, { size: 2 } ], 4.5, true);
// t([ { size: 2 }, { size: 1, _float: true }, { size: 2, _float: true }, { size: 2 } ], 4.5, true);

//var preg = new THREE.BoxGeometry(2,2,2);

var preg = new THREE.Geometry();
preg.vertices.push(new THREE.Vector3(0,0,0),
                   new THREE.Vector3(1,1,0),
                   new THREE.Vector3(2,0,0));
preg.faces.push(new THREE.Face3(0,1,2));

//preg.translate(2,0,0);

// var preg = new THREE.Geometry();
// preg.vertices.push(new THREE.Vector3(-1,0,0),
//                    new THREE.Vector3(-1,1,0),
//                    new THREE.Vector3(1,0,0));
// preg.faces.push(new THREE.Face3(0,1,2));

// preg.translate(2,0,0);


preg.computeBoundingBox();
console.dir(preg.boundingBox);
console.log(preg.vertices.length, preg.faces.length);
debugger;
var g = cgaprocessor.split_geometry('x', preg, 0.5, 1.5);

g.computeBoundingBox();

console.dir(g.boundingBox);
console.log(g.vertices.length, g.faces.length);

g.vertices.forEach( v => console.log(v) );
g.faces.forEach( v => console.log(v.a,v.b,v.c) );
