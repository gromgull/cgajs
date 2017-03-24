var THREE = require("three");
var OrbitControls = require('./orbitcontrols');
var cgaparser = require("./cgaparser");
var cgaprocessor = require("./cgaprocessor");

require("./format");


function $(sel) {
  return document.querySelector(sel);
}

$.create = function(n, v, c) {
  n = document.createElement(n);
  for (var p in v)
    n.setAttribute(p, v[p]);
  if (c) n.innerHTML = c;
  return n;
};


var examples = {
  basic: 'Lot --> extrude(2) split(y) { 0.2 : r(0, rand(0,30), 0) Floor }*',
  house: "Lot --> extrude(1) comp(f) { front: Front | side: Side | top: Roof |  bottom: B }\n\
\n\
Roof -->  color(\"red\") taper(1) split(y) { '0.5 : R }\n\
Front --> extrude(0.02) split(x) { ~0.3: Side | 0.6 : DoorWall | ~0.3: Side }\n\
\n\
TopWall --> color(\"white\") \n\
\n\
DoorWall --> split(y) { '0.8: Door | '0.2 : TopWall }\n\
\n\
Door --> color(\"0x999933\") t(0,0,0.02)\n\
\n\
Side --> color(\"white\") split(x) { ~0.3: W }*"
};


function setup() {
  var canvas = $('canvas');

  var FOGCOLOR = 0x112244;
  var SHININESS = 30;

  var lot = 'triangle';
  var grammar;
  var last;
  var group;

  var renderer, camera, controls, scene;
  var default_material, wire_material;

  $('.lot-selector').addEventListener('change', e => {
    lot=e.target.value;
    update();
  });

  $('#updateBtn').addEventListener('click', update);

  Object.keys(examples).forEach(e => $('.example-selector').appendChild( $.create('option', null, e) ) );
  $('.example-selector').addEventListener('change', e => {
    if (!e.target.value) return;
    $('textarea').value = examples[e.target.value];
    parse();
  });

  var grammarText = localStorage.getItem('grammar');
  if (grammarText) $('textarea').value = grammarText;


  setupThreejs();

  createScene();

  parse();

  render();


  window.addEventListener( 'resize', onWindowResize, false );

  $('textarea').addEventListener('keyup', parse);

  $('canvas').addEventListener('keydown', e => { console.log(e); if (e.key==' ') controls.autoRotate = !controls.autoRotate; });



  function setupThreejs() {
    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 5;
    camera.position.y = 3;
    camera.rotation.x = -0.5;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;

    controls = new OrbitControls( camera, canvas );
    controls.autoRotate = true;
    controls.enableZoom = true;
    controls.maxPolarAngle = Math.PI/2-0.01;

    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
    renderer.setSize( canvas.clientWidth, canvas.clientHeight );
    renderer.setClearColor( FOGCOLOR );
    renderer.shadowMap.soft = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

  }

  function createScene() {

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2( FOGCOLOR, 0.06 );

    default_material = new THREE.MeshLambertMaterial( { shininess: SHININESS, color: 0x6699ff } );

    wire_material = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
    var grass_material = new THREE.MeshPhongMaterial( { color: 0x44bb55 , shininess: 10 } );

    group = new THREE.Group();
    group.castShadow=true;
    scene.add( group );

    var ground = new THREE.Mesh(new THREE.PlaneGeometry( 150, 150 ), grass_material);
    ground.receiveShadow = true;
    ground.rotateX(-Math.PI/2);
    ground.position.y = -0.01;
    ground.scale.set(100,100,100);
    scene.add(ground);

    var size = 100;
    var divisions = 100;

    var gridHelper = new THREE.GridHelper( size, divisions );
    scene.add( gridHelper );


    //Create a DirectionalLight and turn on shadows for the light
    var light = new THREE.DirectionalLight( 0xffffff, 1, 100 );
    light.position.set( 3, 2, 3);

    light.castShadow = true;            // default false


    scene.add( light );

    //Create a DirectionalLight and turn on shadows for the light
    light = new THREE.DirectionalLight( 0xffffff, 0.3, 100 );
    light.position.set( -2, 1, -4);

    light.castShadow = true;            // default false


    scene.add( light );



    // //Create a helper for the shadow camera (optional)
    // var helper = new THREE.CameraHelper( light.shadow.camera );
    // scene.add( helper );
    scene.add(new THREE.AmbientLight( 0x404040 )); // soft white light

  }


  function onWindowResize() {
	camera.aspect = canvas.parentElement.clientWidth / canvas.parentElement.clientHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( canvas.parentElement.clientWidth-30, canvas.parentElement.clientHeight );
  }

  function render() {
    controls.update();
	requestAnimationFrame( render );
	renderer.render( scene, camera );
  }

  function parse() {
    if ($('textarea').value == last) return;
    $('#error').innerHTML = '';
    try {
      last = $('textarea').value;
      grammar = cgaparser.parse(last);
      $('#out').innerHTML = String(grammar);

      localStorage.setItem('grammar', last);
      update();

    } catch (e) {
      console.log(e);
      $('#error').innerHTML=e;
      return ;
    }
  }

  function update() {
    var lotGeom = new THREE.Geometry();

    if ( lot == 'triangle') {
      var h = Math.sqrt(3);
      lotGeom.vertices.push( new THREE.Vector3( -1, 0,  h/2 ) );
      lotGeom.vertices.push( new THREE.Vector3(  0, 0, -h/2 ) );
      lotGeom.vertices.push( new THREE.Vector3(  1, 0,  h/2 ) );


      lotGeom.faces.push( new THREE.Face3( 0, 2, 1 ) );
    } else if ( lot == 'square' ) {
      lotGeom.vertices.push( new THREE.Vector3( -1, 0, -1 ) );
      lotGeom.vertices.push( new THREE.Vector3(  1, 0, -1 ) );
      lotGeom.vertices.push( new THREE.Vector3(  1, 0, 1 ) );
      lotGeom.vertices.push( new THREE.Vector3(  -1, 0, 1 ) );

      lotGeom.faces.push( new THREE.Face3( 0, 2, 1 ) );
      lotGeom.faces.push( new THREE.Face3( 2, 0, 3 ) );
    } else if (lot == 'rectangle') {
      lotGeom.vertices.push( new THREE.Vector3( -1.5, 0, -1 ) );
      lotGeom.vertices.push( new THREE.Vector3(  1.5, 0, -1 ) );
      lotGeom.vertices.push( new THREE.Vector3(  1.5, 0, 1 ) );
      lotGeom.vertices.push( new THREE.Vector3(  -1.5, 0, 1 ) );

      lotGeom.faces.push( new THREE.Face3( 0, 2, 1 ) );
      lotGeom.faces.push( new THREE.Face3( 2, 0, 3 ) );

    }
    lotGeom.computeFaceNormals();
    lotGeom.computeVertexNormals();

    for( var i = group.children.length - 1; i >= 0; i--) {
      var e = group.children[i];
      group.remove(e);
      e.geometry.dispose();

    }

    var proc = new cgaprocessor.Processor(grammar);
    var res = proc.process(lotGeom);
    console.log(res);

    res.forEach(r => {
      r.computeFaceNormals();
      r.computeVertexNormals();

      var material = default_material;

      var attrs = r.attrs;
      if ( attrs && attrs.material && attrs.material.color )
        material = new THREE.MeshLambertMaterial({ shininess: default_material.shininess,
                                                 color: attrs.material.color });

      var mesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(r), material);
      mesh.castShadow = true;
      group.add(mesh);

      var wireframe = new THREE.LineSegments( new THREE.EdgesGeometry(r), wire_material );
      //var wireframe = new THREE.LineSegments( new THREE.WireframeGeometry(r), wire_material );
      group.add( wireframe );

    });

  }
}

setup();
