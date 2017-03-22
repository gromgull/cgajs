var THREE = require("three");
var OrbitControls = require('./orbitcontrols');
var cgaparser = require("./cgaparser");
var cgaprocessor = require("./cgaprocessor");

require("./format");


function $(sel) {
  return document.querySelector(sel);
}


function setup() {
  var canvas = $('canvas');

  var grammar = localStorage.getItem('grammar');
  if (grammar) $('textarea').value=grammar;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2( 0x112244, 0.06 );

  var camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.position.z = 5;
  camera.position.y = 3;
  camera.rotation.x = -0.5;
  camera.aspect = canvas.clientWidth / canvas.clientHeight;

  var controls = new OrbitControls( camera, canvas );
  controls.autoRotate = true;
  controls.enableZoom = true;
  controls.maxPolarAngle = Math.PI/2-0.01;

  var renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
  renderer.setSize( canvas.clientWidth, canvas.clientHeight );
  renderer.setClearColor( scene.fog.color );
  renderer.shadowMap.soft = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap


  var material = new THREE.MeshLambertMaterial( { color: 0x6699ff } );
  var wire_material = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
  var grass_material = new THREE.MeshPhongMaterial( { color: 0x44bb55 } );

  var group = new THREE.Group();
  group.castShadow=true;
  scene.add( group );

  var cube = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), material );
  cube.castShadow = true;
  cube.position.y = 0.5;
  group.add(cube);

  var wireframe = new THREE.LineSegments( new THREE.EdgesGeometry(cube.geometry), wire_material );
  wireframe.position.y = 0.5;
  group.add( wireframe );


  var plane = new THREE.Mesh(new THREE.PlaneGeometry( 150, 150 ), grass_material);
  plane.receiveShadow = true;
  plane.rotateX(-Math.PI/2);
  plane.position.y = -0.01;
  plane.scale.set(100,100,100);
  scene.add(plane);


  //Create a DirectionalLight and turn on shadows for the light
  var light = new THREE.DirectionalLight( 0xffffff, 1, 100 );
  light.position.set( 3, 2, 3); 			//default; light shining from top

  light.castShadow = true;            // default false
  //Set up shadow properties for the light
  // light.shadow.mapSize.width = 1024;
  // light.shadow.mapSize.height = 1024;


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

  var last;
  $('textarea').addEventListener('keyup', () => {
    if ($('textarea').value == last) return;
    $('#error').innerHTML = '';
    var res;
    try {
      last = $('textarea').value;
      res = cgaparser.parse(last);
      $('#out').innerHTML = String(res);

      localStorage.setItem('grammar', last);
      update(res);

    } catch (e) {
      console.log(e);
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

    for( var i = group.children.length - 1; i >= 0; i--) {
      var e = group.children[i];
      group.remove(e);
      e.geometry.dispose();

    }

    var proc = new cgaprocessor.Processor(grammar);
    var res = proc.process(lot);
    console.log(res);

    res.forEach(r => {
      r.computeFaceNormals();
      r.computeVertexNormals();

      r = new THREE.BufferGeometry().fromGeometry(r);

      var mesh = new THREE.Mesh(r, material);
      mesh.castShadow = true;
      group.add(mesh);

      var wireframe = new THREE.LineSegments( new THREE.EdgesGeometry(r), wire_material );
      //var wireframe = new THREE.LineSegments( new THREE.WireframeGeometry(r), wire_material );
      group.add( wireframe );

    });

  }


  // var triangles = THREE.ShapeUtils.triangulateShape ( geometry.vertices, [] );

  // for( var i = 0; i < triangles.length; i++ ){

  //   geometry.faces.push( new THREE.Face3( triangles[i][0], triangles[i][1], triangles[i][2] ));

  // }

}

setup();
