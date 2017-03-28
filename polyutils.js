var THREE = require('three');
var THREEBSP = require('./three-csg');


function split_geometry(axis, geometry, left, right) {
  if (!geometry.faces.length) return geometry;

  geometry.computeBoundingBox();
  var bb = geometry.boundingBox.max.clone().sub(geometry.boundingBox.min);
  if (bb.x < 0.0001 || bb.y < 0.0001 || bb.z < 0.0001 ) return split_flat_geometry(axis, geometry, left, right);
  else return split_solid_geometry(axis, geometry, left, right);
}

function split_flat_geometry(axis, geometry, left, right) {

  function edgeIndex(a,b) {
    if (a<b) return a+','+b;
    else return b+','+a;
  }

  left += geometry.boundingBox.min[axis];
  right += geometry.boundingBox.min[axis];

  function doSide(limit, sign) {

    var vertices = []; // -1 lhs, 0 on, 1 rhs
    var edgeVerticesMap = [];
    var splitvertices = [];
    res = new THREE.Geometry();

    function addFace(v1,v2,v3) {
      var l = res.vertices.length;
      res.vertices.push(v1, v2, v3);
      res.faces.push(new THREE.Face3(l, l+1, l+2));
    }


    function doEdge(a,b) {
      // return 1 if both vertices should be discarded edge, 0 if we keep one, -1 if we keep both

      var idx = edgeIndex(a,b);

      var as = sign*vertices[a];
      var bs = sign*vertices[b];

      var r = ( as == bs) ? as : 0;

      var av = geometry.vertices[a];
      var bv = geometry.vertices[b];

      if (!r) {
        if ( as > 0) {
          console.log('a', av[axis], bv[axis], 'l', av[axis]-bv[axis], 'tolimit', av[axis]-limit, sign, (av[axis]-limit)/(av[axis]-bv[axis]));
          av = new THREE.Vector3().lerpVectors(av, bv, (av[axis]-limit)/(av[axis]-bv[axis]));
        }
        if ( bs > 0) {
          console.log('b', av[axis], bv[axis], 'l', bv[axis]-av[axis],  'tolimit', bv[axis]-limit, sign, (bv[axis]-limit)/(bv[axis]-av[axis]));
          bv = new THREE.Vector3().lerpVectors(bv, av, (bv[axis]-limit)/(bv[axis]-av[axis]));
        }
      }

      if (r>0)
        edgeVerticesMap[idx] = null;
      else
        edgeVerticesMap[idx] = { a: av, b: bv };

      return r;
    }

    geometry.vertices.forEach((v,i) => {
      vertices[i] = Math.sign(v[axis]-limit);
    });


    geometry.faces.forEach( (f,i) => {
      var es = [ doEdge(f.a, f.b), doEdge(f.b, f.c), doEdge(f.c, f.a) ];

      if ( es.every( e => e>0 )) return; // entire face discarded

      if ( es.every( e => e<0 )) return addFace(geometry.vertices[f.a], geometry.vertices[f.b], geometry.vertices[f.c]); // keep all

      var faceVertices = [];

      var edges = [ { a: f.a, b: f.b }, { a: f.b, b: f.c }, { a: f.c, b: f.a } ];

      edges.forEach(e => {
        var newe = edgeVerticesMap[edgeIndex(e.a, e.b)];
        if (!newe) return;
        if (!(faceVertices.length && faceVertices[faceVertices.length-1]==newe.a)) faceVertices.push(newe.a);
        faceVertices.push(newe.b);
      });
      if (faceVertices[0] == faceVertices[faceVertices.length-1])
        faceVertices.splice(faceVertices.length-1,1);

      if (faceVertices.length==3) {
        addFace( faceVertices[0], faceVertices[1], faceVertices[2] );
      } else {
        addFace( faceVertices[0], faceVertices[1], faceVertices[2] );
        addFace( faceVertices[2], faceVertices[3], faceVertices[0] );
      }

    });

    return res;
  }

  geometry = doSide(left, -1);
  geometry.mergeVertices();
  geometry = doSide(right, 1);
  geometry.mergeVertices();

  return geometry;

}

function split_solid_geometry(axis, geometry, left, right) {

  var leftbox, rightbox, offset;

  if (!geometry.faces.length) return geometry;

  geometry.computeBoundingBox();

  _g = new THREEBSP(geometry);

  var bb = geometry.boundingBox.max.clone().sub(geometry.boundingBox.min);
  bb.max( new THREE.Vector3( 0.01, 0.01, 0.01 ));

  if (left > bb[axis]) return new THREE.Geometry(); // empty

  if (left) {

    var bbl = bb.clone();
    bbl.multiplyScalar(1.01);
    bbl[axis] = left+0.02;

    leftbox = new THREE.BoxGeometry( bbl.x, bbl.y, bbl.z );

    offset = geometry.boundingBox.getCenter();
    offset[axis] += - bb[axis]/2 + left/2 - 0.01;
    leftbox.translate( offset.x, offset.y, offset.z );


    _g = _g.subtract(new THREEBSP(leftbox));
  }

  if (right) {
    var bbr = bb.clone();
    bbr.multiplyScalar(1.01);
    bbr[axis] = bb[axis]-right+0.02;

    rightbox = new THREE.BoxGeometry( bbr.x, bbr.y, bbr.z );
    offset = geometry.boundingBox.getCenter();
    offset[axis] += bb[axis]/2 - (bb[axis]-right)/2 + 0.01;
    rightbox.translate( offset.x, offset.y, offset.z );

    _g = _g.subtract(new THREEBSP(rightbox));

  }

  var g = _g.toGeometry();
  g.mergeVertices();
  g.computeBoundingBox();

  // console.log('Split {min}, {max} at {left}-{right} and got {newmin}, {newmax}'.format({min: JSON.stringify(geometry.boundingBox.min),
  //                                                                                       max: JSON.stringify(geometry.boundingBox.max),
  //                                                                                       left: left,
  //                                                                                       right: right,
  //                                                                                       newmin: JSON.stringify(g.boundingBox.min),
  //                                                                                       newmax: JSON.stringify(g.boundingBox.max) }));

  return g;

}


/**
   Based on THREE.EdgesGeometry by:
 * @author WestLangley / http://github.com/WestLangley
 * @author Mugen87 / https://github.com/Mugen87
 */

function find_hard_edges( geometry, thresholdAngle ) {


  thresholdAngle = ( thresholdAngle !== undefined ) ? thresholdAngle : 1;

  // helper variables

  var thresholdDot = Math.cos( THREE.Math.DEG2RAD * thresholdAngle );
  var edge = [ 0, 0 ], edges = {};
  var key, keys = [ 'a', 'b', 'c' ];

  // prepare source geometry

  geometry.mergeVertices();
  geometry.computeFaceNormals();

  var sourceVertices = geometry.vertices;
  var faces = geometry.faces;

  // now create a data structure where each entry represents an edge with its adjoining faces

  for ( var i = 0, l = faces.length; i < l; i ++ ) {

	var face = faces[ i ];

	for ( var j = 0; j < 3; j ++ ) {

	  edge[ 0 ] = face[ keys[ j ] ];
	  edge[ 1 ] = face[ keys[ ( j + 1 ) % 3 ] ];
	  edge.sort( sortFunction );

	  key = edge.toString();

	  if ( edges[ key ] === undefined ) {

		edges[ key ] = { index1: edge[ 0 ], index2: edge[ 1 ], face1: i, face2: undefined };

	  } else {

		edges[ key ].face2 = i;

	  }

	}

  }

  var res = {};
  // generate vertices

  for ( key in edges ) {

	var e = edges[ key ];

	// an edge is only rendered if the angle (in degrees) between the face normals of the adjoining faces exceeds this value. default = 1 degree.

	if ( e.face2 === undefined || faces[ e.face1 ].normal.dot( faces[ e.face2 ].normal ) <= thresholdDot ) {

      res[e.index1+','+e.index2] = true;
      res[e.index2+','+e.index1] = true;

	}

  }

  return res;

  // custom array sort function

  function sortFunction( a, b ) {

	return a - b;

  }



}


module.exports = {
  find_hard_edges: find_hard_edges,
  split_geometry: split_geometry
};
