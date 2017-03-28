var THREE = require("three");

var cgaparser = require("./cgaparser");
var cgaprocessor = require("./cgaprocessor");



function t(g) {
  var lotGeom = new THREE.Geometry();

  var h = Math.sqrt(3);

  lotGeom.vertices.push( new THREE.Vector3( -1, 0,  h/2 ) );
  lotGeom.vertices.push( new THREE.Vector3(  0, 0, -h/2 ) );
  lotGeom.vertices.push( new THREE.Vector3(  1, 0,  h/2 ) );


  lotGeom.faces.push( new THREE.Face3( 0, 2, 1 ) );

  lotGeom.rotateY(30);

  console.log(g);
  var cga = cgaparser.parse(g);
  console.log(cga);
  var proc = new cgaprocessor.Processor(cga);
  var res = proc.process(lotGeom);


  res.forEach( g => {
    g.computeBoundingBox();
    console.log( g.vertices.length , g.faces.length, g.boundingBox );
  });
  console.log('-----------------------------------------------------------------');
}


// t('Lot --> extrude(2) ');

t('Lot --> extrude(2) X \n X --> split(y) { 0.2 : r(0, rand(0,30), 0) C | 0.3 : Floor Floor }*\n C --> r(0,0,0) A ');
t('Lot --> extrude(2) X \n X --> comp(f) { front : r(0, rand(0,30), 0) C | left : Floor }*\n C --> r(0,0,0) A A ');

// t('Lot --> Floor Floor \n Floor --> A A ');

// t('Lot --> Floor \n Floor --> r(0,0,0)');
