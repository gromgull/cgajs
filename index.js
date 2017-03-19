var THREE = require("three/three");
var cga = require("./cga");
var cgaparser = require("./cgaparser");
require("./format");


function $(sel) {
  return document.querySelector(sel);
}


function setup() {
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

  var canvas = $('canvas');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas });
  renderer.setSize( canvas.clientWidth, canvas.clientHeight );
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  var geometry = new THREE.BoxGeometry( 1, 1, 1 );
  var material = new THREE.MeshLambertMaterial( { color: 0x6699ff } );
  material.side = THREE.DoubleSide;

  var cube = new THREE.Mesh( geometry, material );


  var group = new THREE.Group();
  group.add(cube);

  scene.add( group );

  camera.position.z = 5;
  camera.position.y = 3;
  camera.rotation.x = -0.5;

  // create a point light
  const pointLight =
        new THREE.PointLight(0xFFFFFF);

  // set its position
  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;

  // add to the scene
  scene.add(pointLight);

  var light = new THREE.AmbientLight( 0x404040 ); // soft white light
  scene.add( light );
  function render() {

    group.rotation.y += 0.01;

	requestAnimationFrame( render );
	renderer.render( scene, camera );
  }
  render();

  $('textarea').addEventListener('keyup', () => {
    $('#error').innerHTML = '';
    var res;
    try {
      res = cgaparser.parse($('textarea').value);
    } catch (e) {
      $('#error').innerHTML=e;
      return ;
    }

    $('#out').innerHTML = String(res);

    update(res);

  });


  function update(grammar) {
    var lot = new THREE.Geometry();

    lot.vertices.push( new THREE.Vector3( -1, 0, -1 ) );
    lot.vertices.push( new THREE.Vector3(  1, 0, -1 ) );
    lot.vertices.push( new THREE.Vector3(  1, 0, 1 ) );

    lot.faces.push( new THREE.Face3( 0, 1, 2 ) );

    lot.computeFaceNormals();
    lot.computeVertexNormals();

    for( var i = group.children.length - 1; i >= 0; i--) group.remove(group.children[i]);

    var res = process(grammar, lot);
    res.computeFaceNormals();
    res.computeVertexNormals();

    console.log(res);
    group.add(new THREE.Mesh(res, material));

  }

  function process(grammar, lot) {
    var data = {};
    var rules = {};

    function applyFunction(geometry, func) {
      if (func.name == 's') {
        if (func.params.length!=3) throw 's function takes 3 parameters';
        if (!func.params.every( p => p instanceof cga.Relative )) throw 'Only relative scaling supported';
        return geometry.clone().scale(func.params[0].value, func.params[1].value, func.params[2].value);
      } else if (func.name == 'extrude') {
        if (func.params.length!=1) throw 'extrude function takes 1 parameters';

        geometry = geometry.clone();
        geometry.faces.forEach(f => {
          var l = geometry.vertices.length;
          var extrude = v => v.clone().addScaledVector(f.normal, -func.params[0].value);
          geometry.vertices.push( extrude(geometry.vertices[f.a] ));
          geometry.vertices.push( extrude(geometry.vertices[f.b] ));
          geometry.vertices.push( extrude(geometry.vertices[f.c] ));

          geometry.faces.push( new THREE.Face3(l+0, l+1, l+2) );

          geometry.faces.push( new THREE.Face3(f.a, l+0, l+1) );
          geometry.faces.push( new THREE.Face3(f.a, l+1, f.b) );

          geometry.faces.push( new THREE.Face3(f.a, l+0, l+2) );
          geometry.faces.push( new THREE.Face3(f.a, l+2, f.c) );

          geometry.faces.push( new THREE.Face3(f.b, l+1, l+2) );
          geometry.faces.push( new THREE.Face3(f.b, l+2, f.c) );

          //hmm
        });
        return geometry;
      }
      throw 'Unknown function: '+func.name;
    }

    function applyRule(rule, geometry) {
      if (rule instanceof cga.Rule) {
        return rule.successors.reduce(applyFunction, geometry);
      } else {
        throw "Unknown rule type: "+typeof rule;
      }
    }

    Object.assign(data, grammar.attr);
    grammar.rules.forEach(r => rules[r.name] = r);
    var res = applyRule(rules.Lot, lot);
    return res;
  }

  // var triangles = THREE.ShapeUtils.triangulateShape ( geometry.vertices, [] );

  // for( var i = 0; i < triangles.length; i++ ){

  //   geometry.faces.push( new THREE.Face3( triangles[i][0], triangles[i][1], triangles[i][2] ));

  // }

}

setup();
