var THREE = require("three/build/three.min");
var OrbitControls = require('./orbitcontrols');
var cgaparser = require("./cgaparser");
var cgaprocessor = require("./cgaprocessor");

require("./format");


function $(sel) {
  return document.querySelector(sel);
}


function setup() {
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 );
  scene.fog = new THREE.FogExp2( 0x000000, 0.002, 3000 );
  var canvas = $('canvas');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas });
  renderer.setSize( canvas.clientWidth, canvas.clientHeight );
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  renderer.setClearColor( scene.fog.color );
  var geometry = new THREE.BoxGeometry( 1, 1, 1 );
  var material = new THREE.MeshLambertMaterial( { color: 0x6699ff } );

  var controls = new OrbitControls( camera, renderer.domElement );
  controls.autoRotate=true;

  var cube = new THREE.Mesh( geometry, material );
  cube.castShadow = true;
  cube.position.y = 0.5;

  var grass_material = new THREE.MeshPhongMaterial( { color: 0x00ff00 } );

  var plane = new THREE.Mesh(new THREE.PlaneGeometry( 150, 150 ), grass_material);
  plane.receiveShadow = true;
  plane.rotateX(-Math.PI/2);
  plane.position.y = -0.01;
  plane.scale.set(100,100,100);
  scene.add(plane);
  renderer.shadowMap.soft = true;

  var group = new THREE.Group();
  group.castShadow=true;
  group.add(cube);

  scene.add( group );

  camera.position.z = 5;
  camera.position.y = 2;
  camera.rotation.x = -0.5;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

  //Create a DirectionalLight and turn on shadows for the light
  var light = new THREE.DirectionalLight( 0xffffff, 1, 100 );
  light.position.set( 3, 2, 3); 			//default; light shining from top

  light.castShadow = true;            // default false
  //Set up shadow properties for the light
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;


  scene.add( light );


  // //Create a helper for the shadow camera (optional)
  // var helper = new THREE.CameraHelper( light.shadow.camera );
  // scene.add( helper );
  scene.add(new THREE.AmbientLight( 0x404040 )); // soft white light

  function render() {
    controls.update();
	requestAnimationFrame( render );
	renderer.render( scene, camera );
  }
  render();

  $('textarea').addEventListener('keyup', () => {
    $('#error').innerHTML = '';
    var res;
    try {
      res = cgaparser.parse($('textarea').value);
      $('#out').innerHTML = String(res);

      update(res);

    } catch (e) {
      $('#error').innerHTML=e;
      return ;
    }


  });


  function update(grammar) {
    var lot = new THREE.Geometry();

    lot.vertices.push( new THREE.Vector3( -1, 0, -1 ) );
    lot.vertices.push( new THREE.Vector3(  1, 0, -1 ) );
    lot.vertices.push( new THREE.Vector3(  1, 0, 1 ) );

    lot.faces.push( new THREE.Face3( 0, 2, 1 ) );

    lot.computeFaceNormals();
    lot.computeVertexNormals();

    for( var i = group.children.length - 1; i >= 0; i--) group.remove(group.children[i]);

    var res = cgaprocessor.process(grammar, lot);
    console.log(res);

    res.forEach(r => {
      r.computeFaceNormals();
      r.computeVertexNormals();

      var mesh = new THREE.Mesh(r, material);
      mesh.castShadow = true;
      group.add(mesh);
    });

  }


  // var triangles = THREE.ShapeUtils.triangulateShape ( geometry.vertices, [] );

  // for( var i = 0; i < triangles.length; i++ ){

  //   geometry.faces.push( new THREE.Face3( triangles[i][0], triangles[i][1], triangles[i][2] ));

  // }

}

setup();
