var THREE = require('three');


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


module.exports = { find_hard_edges: find_hard_edges };
