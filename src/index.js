var THREE = require("three");
var OrbitControls = require('./orbitcontrols');
var cgaparser = require("./cgaparser");
var cgaprocessor = require("./cgaprocessor");

require("./format");


function $(sel) {
  return document.querySelector(sel);
}

$.get = function(url, callback, error) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);

  request.onload = () => {
    if (request.status >= 200 && request.status < 400) {
      if (callback) callback(request.responseText);
    } else {
      if (error) error();
    }
  };

  request.onerror = error;

  request.send();
};


$.create = function(n, v, c) {
  n = document.createElement(n);
  for (var p in v)
    n.setAttribute(p, v[p]);
  if (c) n.innerHTML = c;
  return n;
};



function setup() {
  var canvas = $('canvas');

  var FOGCOLOR = 0x42bcf4;
  var SHININESS = 30;

  var lot = 'triangle';
  var grammar;
  var last;
  var group;

  var renderer, camera, controls, scene;
  var default_material, wire_material;

  var grid_size = 100;
  var grid_divisions = 100;
  var gridHelper = new THREE.GridHelper( grid_size, grid_divisions );
  var axisHelper = new THREE.AxisHelper();
  axisHelper.position.x += 3;

  var showGrid = false;

  var examples = {};


  $('.lot-selector').addEventListener('change', e => {
    lot=e.target.value;
    update();
  });

  $('#updateBtn').addEventListener('click', update);

  $('.example-selector').addEventListener('change', e => {
    if (!e.target.value) return;

    function set(val) {
      examples[e.target.value] = val;
      $('textarea').value = val;
      parse();
    }
    if (examples[e.target.value]) set(examples[e.target.value]);
    else $.get('examples/'+e.target.value+'.cga', set);
  });

  var grammarText = localStorage.getItem('grammar');
  if (grammarText) $('textarea').value = grammarText;


  setupThreejs();

  createScene();

  parse();

  render();

  window.addEventListener( 'resize', onWindowResize, false );

  var timeout;
  $('textarea').addEventListener('keyup', e => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(parse, 500);
  } );

  $('canvas').addEventListener('keydown', e => { console.log(e); if (e.key==' ') controls.autoRotate = !controls.autoRotate; });

  $('.grid-checkbox').addEventListener('change', e => toggleGrid($('.grid-checkbox').checked) );


  function toggleGrid(val) {

    if (val) {
      scene.add(gridHelper);
      scene.add(axisHelper);
      showGrid = true;
    } else {
      scene.remove(gridHelper);
      scene.remove(axisHelper);
      showGrid = false;
    }
    update();
  }

  function setupThreejs() {
    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 5;
    camera.position.y = 3;
    camera.rotation.x = -0.5;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;

    controls = new OrbitControls( camera, canvas );
    controls.autoRotate = false;
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


    //Create a DirectionalLight and turn on shadows for the light
    var light = new THREE.DirectionalLight( 0xffffff, 1, 100 );
    light.position.set( 3, 2, 3);

    light.castShadow = true;            // default false


    scene.add( light );

    light = new THREE.DirectionalLight( 0xffffff, 0.3, 100 );
    light.position.set( 0, 2, -3);

    light.castShadow = true;            // default false


    scene.add( light );


    //Create a DirectionalLight and turn on shadows for the light
    light = new THREE.DirectionalLight( 0xffffff, 0.3, 100 );
    light.position.set( -3, 1, 0);
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

  function square_lot() {
    var lotGeom = new THREE.Geometry();
    lotGeom.vertices.push( new THREE.Vector3(  -1, 0, 1 ) );
    lotGeom.vertices.push( new THREE.Vector3(  1, 0, 1 ) );

    lotGeom.vertices.push( new THREE.Vector3( -1, 0, -1 ) );
    lotGeom.vertices.push( new THREE.Vector3(  1, 0, -1 ) );

    lotGeom.faces.push( new THREE.Face3( 0, 1, 2 ) );
    lotGeom.faces.push( new THREE.Face3( 2, 1, 3 ) );

    return lotGeom;
  }

  function triangle_lot() {
    var lotGeom = new THREE.Geometry();
    var h = Math.sqrt(3);
    lotGeom.vertices.push( new THREE.Vector3( -1, 0,  h/2 ) );
    lotGeom.vertices.push( new THREE.Vector3(  0, 0, -h/2 ) );
    lotGeom.vertices.push( new THREE.Vector3(  1, 0,  h/2 ) );

    lotGeom.faces.push( new THREE.Face3( 0, 2, 1 ) );
    return lotGeom;
  }

  function circle_lot() {
    var lotGeom = new THREE.Geometry();
    var N = 16;
    for (var i=0; i<N; i++) {
      var r = i*2*Math.PI/N;
      lotGeom.vertices.push( new THREE.Vector3( Math.sin(r), 0,  Math.cos(r) ) );
    }
    lotGeom.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
    var c = lotGeom.vertices.length-1;
    for (i=0; i<N; i++) {
      lotGeom.faces.push( new THREE.Face3( i, (i+1)%N, c) );
    }

    return lotGeom;

  }

  function random_lot() {
    switch(Math.floor(Math.random()*3)) {
      case 0: return triangle_lot();
      case 1: return square_lot();
      case 2: return circle_lot();
    }
  }

  function update() {
    var lotGeom;

    if ( lot == 'triangle') {
      lotGeom = triangle_lot();
    } else if ( lot == 'circle' ) {
      lotGeom = circle_lot();
    } else if ( lot == 'square' ) {

      lotGeom = square_lot();

    } else if (lot == 'rectangle') {

      lotGeom = square_lot().scale(1.5, 1, 1);

    } else if (lot == '4squares') {

      lotGeom = [];

      lotGeom.push( square_lot() );
      lotGeom.push( square_lot().rotateY(-Math.PI/2).translate(-3, 0, 0) );
      lotGeom.push( square_lot().rotateY(Math.PI/2).translate(0, 0, 3) );
      lotGeom.push( square_lot().rotateY(Math.PI).translate(-3, 0, 3) );


    } else if (lot == '9squares') {

      lotGeom = [];

      for (var i = -1; i<2; i++ )
        for (var j = -1; j<2; j++ )
          lotGeom.push( square_lot().rotateY(Math.floor(Math.random()*4)*Math.PI/2).translate(i*3, 0, j*3) );

    } else if (lot == '25random') {

      lotGeom = [];

      for (var i = -2; i<3; i++ )
        for (var j = -2; j<3; j++ )
          lotGeom.push( random_lot().rotateY(Math.random()*2*Math.PI).translate(i*3+Math.random()-0.5, 0, j*3+Math.random()-0.5) );

    } else throw 'Unknown lot type: '+lot;

    if (!(lotGeom instanceof Array)) lotGeom = [lotGeom];

    for( var i = group.children.length - 1; i >= 0; i--) {
      var e = group.children[i];
      group.remove(e);
      e.geometry.dispose();

    }

    var proc = new cgaprocessor.Processor(grammar);
    lotGeom.forEach(g => {

      g.computeFaceNormals();
      g.computeVertexNormals();

      var res = proc.process(g);
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

        if (showGrid) {
          var wireframe = new THREE.LineSegments( new THREE.EdgesGeometry(r), wire_material );
          //var wireframe = new THREE.LineSegments( new THREE.WireframeGeometry(r), wire_material );
          group.add( wireframe );
        }

      });
    });

  }
}

setup();
