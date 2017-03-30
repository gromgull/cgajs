var cga = require("./cga");
var THREE = require('three');

var polyutils = require('./polyutils.js');

function peek(arr) {
  return arr[arr.length-1];
}

function quat_from_first_face(g) {
  // CGA sub-shapes from comp have their coordinate system defined
  // by the first vertex + the x axis along first edge.
  var pivot_x = g.vertices[g.faces[0].b].clone().sub(g.vertices[g.faces[0].a]).normalize();

  var quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(1,0,0), pivot_x);

  return quat;
}

function clone_obj(obj) {
  if (obj)
    return JSON.parse(JSON.stringify(obj));
}

function split_array(a, sep) {
  var res = [], chunk=[];
  a.forEach( e => { if (e!=sep) chunk.push(e); else { res.push(chunk); chunk = []; } });
  if (chunk.length) res.push(chunk);
  return res;
}


function func_extrude(processor, amount) {

  var geometry = processor.create();

  var top = processor.top;

  var hard_edges = polyutils.find_hard_edges(top);

  top.computeFaceNormals();

  top.faces.forEach(f => {
    var l = geometry.vertices.length;

    geometry.vertices.push( top.vertices[f.a].clone() );
    geometry.vertices.push( top.vertices[f.b].clone() );
    geometry.vertices.push( top.vertices[f.c].clone() );

    var extrude = v => v.clone().addScaledVector(f.normal, amount);

    geometry.vertices.push( extrude(top.vertices[f.a] ));
    geometry.vertices.push( extrude(top.vertices[f.b] ));
    geometry.vertices.push( extrude(top.vertices[f.c] ));

    // bottom
    geometry.faces.push( new THREE.Face3(l+0, l+2, l+1) );

    // top
    geometry.faces.push( new THREE.Face3(l+3, l+4, l+5) );

    // a-b
    if (hard_edges[f.a+','+f.b]) {
      geometry.faces.push( new THREE.Face3(l+0, l+1, l+4) );
      geometry.faces.push( new THREE.Face3(l+0, l+4, l+3) );
    }

    // a-c
    if (hard_edges[f.a+','+f.c]) {
      geometry.faces.push( new THREE.Face3(l+2, l+0, l+5) );
      geometry.faces.push( new THREE.Face3(l+0, l+3, l+5) );

    }

    // b-c
    if (hard_edges[f.b+','+f.c]) {
      geometry.faces.push( new THREE.Face3(l+1, l+2, l+5) );
      geometry.faces.push( new THREE.Face3(l+1, l+5, l+4) );
    }


  });


  geometry.mergeVertices();

  console.log("From {v}/{f} vertices/faces, extruded {nv}/{nf}".format({v: top.vertices.length, f: top.faces.length,
                                                                        nv: geometry.vertices.length, nf: geometry.faces.length }));

  processor.update( geometry );

}

function func_taper(processor, amount) {

  var geometry = processor.create();

  var hard_edges = polyutils.find_hard_edges(processor.top);

  processor.top.computeBoundingBox();
  processor.top.computeFaceNormals();

  var c = processor.top.boundingBox.getCenter();

  processor.top.faces.forEach( f => {

    var l = geometry.vertices.length;

    var v = c.clone().addScaledVector(f.normal, amount);

    geometry.vertices.push( processor.top.vertices[f.a].clone() );
    geometry.vertices.push( processor.top.vertices[f.b].clone() );
    geometry.vertices.push( processor.top.vertices[f.c].clone() );
    geometry.vertices.push( v );

    // bottom
    geometry.faces.push( new THREE.Face3(l+0, l+2, l+1) );

    if (hard_edges[f.a+','+f.b])
      geometry.faces.push( new THREE.Face3(l+0, l+1, l+3) );

    if (hard_edges[f.b+','+f.c])
      geometry.faces.push( new THREE.Face3(l+1, l+2, l+3) );

    if (hard_edges[f.c+','+f.a])
      geometry.faces.push( new THREE.Face3(l+2, l+0, l+3) );

  });

  geometry.mergeVertices();

  processor.update(geometry);

}


function func_scale(processor, x,y,z) {

  var size = processor.size();

  if (x instanceof cga.Relative) x = x.value;
  else x = x/size.x;

  if (y instanceof cga.Relative) y = y.value;
  else y = y/size.y;

  if (z instanceof cga.Relative) z = z.value;
  else z = z/size.z;

  // this gets relative objects
  processor.top.scale(x, y, z);
}

function func_translate(processor, x,y,z) {

  var size = processor.size();

  if (x instanceof cga.Relative) x = x.value * size.x;

  if (y instanceof cga.Relative) y = y.value * size.y;

  if (z instanceof cga.Relative) z = z.value * size.z;

  processor.top.translate(x,y,z);
}

function func_rotate(processor, x,y,z) {
  processor.top.rotateX(THREE.Math.degToRad(x))
    .rotateY(THREE.Math.degToRad(y))
    .rotateZ(THREE.Math.degToRad(z));
}

function func_rand(processor, min, max) {
  if (!max) { max = min; min = null; }
  if (!min) min = 0;
  if (!max) max = 1;
  return min + Math.random()*(max-min);
}

function _compute_splits(sizes, size, repeat) {
  var res = [], total_floats = 0, floats = [], i=0, current=0, done = false;

  while (!done) {

    var cur = sizes[i];

    if (current + cur.size > size) {

      if ( cur.floating )
        repeat = false;
      else if (current + cur.size - total_floats < size) {
        total_floats -= cur.size;
        if (total_floats<0) break;
        repeat = false;
      } else {
        break;
      }
    }

    if (cur.floating) {
      total_floats += cur.size;
      floats.push(res.length);
    }

    current += cur.size;
    res.push(cur.size);

    i++;
    if (i==sizes.length) {
      if (!repeat) done = true;
      i = 0;
    }
  }

  if (floats.length) { // resize floats

    // recompute total
    total_floats = floats.reduce((a,i) => a+res[i], 0);
    var diff = (current - size)/total_floats;

    floats.forEach( i => res[i]-=res[i]*diff );
  }

  return res;
}

function func_split(processor, axis, body) {

  if ('xyz'.indexOf(axis.value)==-1) throw 'Illegal split-axis: {axis}, can only split by x, y or z'.format({axis:axis});

  var size = processor.size()[axis.value];

  var parts = body.parts;
  total = 0;
  var sizes = parts.map( p => {
    if (p.op != ':' ) throw 'Illegal split operator, must be : was "{op}"'.format(p);
    if (!isValue(p.head)) throw 'Illegal size for split: '+p.head;

    var val = eval_expr(processor, p.head);
    var floating = false;
    if (isRelative(val)) val = size*val.value;
    if (isFloating(val)) { val = val.value; floating = true; }

    total += val;

    return { size: val, operations: p.operations, floating: floating };
  });

  var splits = _compute_splits(sizes, size, body.repeat);

  var left = 0;
  splits.forEach( (s,i) => {
    var geom = polyutils.split_geometry(axis.value, processor.top, left, left+s);
    processor.set_attrs(geom); // color, pivot ++
    processor.stack.push(geom);
    processor.applyOperations(sizes[i%sizes.length].operations);
    processor.stack.pop();
    left += s;
  });

}

function func_comp(processor, selector, body) {

  if (selector.value != 'f') throw 'Illegal comp-selector: {axis}, can only comp by faces (f)'.format({axis:axis});

  processor.top.computeFaceNormals();

  var directions = {
    front: new THREE.Vector3(0,0,1),
    back: new THREE.Vector3(0,0,-1),
    left: new THREE.Vector3(-1,0,0),
    right: new THREE.Vector3(1,0,0),
    top: new THREE.Vector3(0,1,0),
    bottom: new THREE.Vector3(0,-1,0),
  };

  var faces = {};
  var parts = {};

  processor.top.faces.forEach(f => {
    var angels = {};
    var dirs = Object.keys(directions);
    dirs.forEach(d => angels[d] = f.normal.angleTo(directions[d]));
    dirs.sort( (a,b) => angels[a]-angels[b] );

    if (!parts[dirs[0]]) parts[dirs[0]] = [];
    parts[dirs[0]].push(f);

  });


  console.log("Compo found these parts:");
  Object.keys(parts).forEach(p => console.log(p, parts[p].length));

  body.parts.forEach( p => {
    if (p.op != ':' ) throw 'Illegal split operator, must be : was "{op}"'.format(p);

    var ops = [ parts[p.head.name] ];

    if (p.head.name == 'side') ops = [ parts.front, parts.left, parts.right, parts.back ];
    if (p.head.name == 'all') ops = [ parts.top, parts.bottom, parts.front, parts.left, parts.right, parts.back ];


    ops.forEach(part => {
      if (part) {
        var g = processor.create();
        part.forEach( f => {
          var l = g.vertices.length;
          g.vertices.push(processor.top.vertices[f.a].clone());
          g.vertices.push(processor.top.vertices[f.b].clone());
          g.vertices.push(processor.top.vertices[f.c].clone());
          g.faces.push(new THREE.Face3(l+0,l+1,l+2));

        });

        g.mergeVertices();

        processor.stack.push(g);

        g.pivot = g.vertices[g.faces[0].a].clone();
        g.pivotRotate = new THREE.Euler().setFromQuaternion( quat_from_first_face(g) );

        // console.log('x axis', pivot_x, 'pivot', g.pivot, 'rot', g.pivotRotate);

        processor.update_pivot_matrix();

        // console.log('pre', g.vertices[g.faces[0].a], g.vertices[g.faces[0].b].clone().sub(g.vertices[g.faces[0].a]).normalize());

        g.applyMatrix( g.pivotTransformInverse );

        // console.log('post', g.vertices[g.faces[0].a], g.vertices[g.faces[0].b].clone().sub(g.vertices[g.faces[0].a]).normalize());

        processor.applyOperations(p.operations);
        processor.stack.pop();
      }
    });


  });


}


function func_set(processor, attr, val) {
  if (!processor.top.attrs) processor.top.attrs = {};
  if (!processor.top.attrs[attr.obj]) processor.top.attrs[attr.obj] = {};

  if (isString(val) && val.indexOf('0x') === 0) val = parseInt(val, 16);
  processor.top.attrs[attr.obj][attr.field] = val;
}

function func_color(processor, val, g, b) {
  if ( g !== undefined ) {
    val = 256*256*Math.floor(val) + 256*Math.floor(g) + Math.floor(b);
    console.log(val.toString(16));
  }
  func_set(processor, new cga.AttrRef('material', 'color'), val);
}

function func_stack(processor, body) {

  var g = processor.top.clone();
  processor.set_attrs(g);

  processor.stack.push(g);
  processor.applyOperations(body);
  processor.stack.pop();

}

function func_cube(processor, w, h, d) {
  if ([w,h,d].some( e => e === undefined ) && ![w,h,d].every( e => e === undefined )) throw 'Specify either all or no dimensions!';

  var top = processor.top;
  top.computeBoundingBox();

  var c = top.boundingBox.getCenter();
  var size;
  if ( w===undefined ) {
    size = processor.size();
    if (!size.lengthManhattan()) throw 'Zero size scope for insert primitive!';
    if (!size.y) size.y = (size.x+size.z)/2;

  } else {
    size = { x:w, y:h, z:d };
    c.y = size.y/2;
  }

  var g = new THREE.BoxGeometry(size.x, size.y, size.z);

  g.translate(c.x, c.y, c.z);

  processor.set_attrs(g);

  processor.update(g);

}

function func_sphere(processor, xd, yd, r) {

  var top = processor.top;
  top.computeBoundingBox();

  if (!xd) xd = 16;
  if (!yd) yd = 16;

  var c = top.boundingBox.getCenter();
  var size;
  if ( r===undefined ) {
    size = processor.size();
    if (!size.lengthManhattan()) throw 'Zero size scope for insert primitive!';
    if (!size.y) size.y = (size.x+size.z)/2;
    r = 0.5;
  } else {
    c.y = r;
  }

  var g = new THREE.SphereGeometry(r, xd, yd);

  if (size) g.scale(size.x, size.y, size.z);

  g.translate(c.x, c.y, c.z);

  processor.set_attrs(g);

  processor.update(g);

}

function func_cylinder(processor, sides, r, h) {

  var top = processor.top;
  top.computeBoundingBox();

  if (!sides) sides = 16;

  var c = top.boundingBox.getCenter();
  var size;
  if ( r===undefined ) {
    size = processor.size();
    if (!size.lengthManhattan()) throw 'Zero size scope for insert primitive!';
    if (!size.y) size.y = (size.x+size.z)/2;
    r = 0.5;
    h = 1;
  } else {
    c.y = h/2;
  }

  var g = new THREE.CylinderGeometry(r, r, h, sides);

  if (size) g.scale(size.x, size.y, size.z);

  g.translate(c.x, c.y, c.z);

  processor.set_attrs(g);

  processor.update(g);

}

function func_center(processor, axis) {
  if (processor.stack.length < 2) throw 'Not enough stuff on the stack';
  var ref = processor.stack[processor.stack.length-2];
  ref.computeBoundingBox();
  processor.top.computeBoundingBox();
  var c = ref.boundingBox.getCenter();
  c.sub(processor.top.boundingBox.getCenter());

  if ( axis.value.indexOf('x') == -1 ) c.x = 0;
  if ( axis.value.indexOf('y') == -1 ) c.y = 0;
  if ( axis.value.indexOf('z') == -1 ) c.z = 0;

  processor.top.translate(c.x, c.y, c.z);

}


var FUNCTIONS = { };


function isNumeric(n) {
  isNumeric.type = 'numeric';
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function isValue(val) {
  isValue.type = 'value';
  return isRelative(val) || isFloating(val) || isNumeric(val);
}

function isRelative(val) {
  isRelative.type = 'relative';
  return val instanceof cga.Relative;
}

function isNumericOrRelative(val) {
  return isNumeric(val) || isRelative(val);
}


function isFloating(val) {
  isFloating.type = 'floating';
  return val instanceof cga.Floating;
}


function isAxis(val) {
  isAxis.type = 'axis';
  return val instanceof cga.Axis;
}


function isFunction(val) {
  isFunction.type = 'function';
  return val instanceof cga.Function;
}

function isAttrRef(val) {
  isAttrRef.type = 'attrref';
  return val instanceof cga.AttrRef;
}

function isCompSelector(val) {
  isCompSelector.type = 'compselector';
  return val instanceof cga.CompSelector;
}

function isString(val) {
  isString.type = 'string';
  return typeof val == 'string';
}

function isStringOrNumeric(val) {
  return isString(val) || isNumeric(val);
}


function isAnything(_) { return true; }

function eval_expr(processor, expr) {
  if ((typeof expr) == 'string') return expr;
  if (isAttrRef(expr)) return expr; // hmm
  if (isCompSelector(expr)) return expr;
  if (isAxis(expr)) return expr;
  if (isNumeric(expr)) return expr;
  if (isFloating(expr)) {
    expr = new cga.Floating(expr.value); // clone
    expr.value = eval_expr(processor, expr.value);
    return expr;
  }
  if (isRelative(expr)) {
    expr = new cga.Relative(expr.value); // clone
    expr.value = eval_expr(processor, expr.value);
    return expr;
  }
  if (isFunction(expr)) {
    if (!FUNCTIONS[expr.name]) throw "Undefined function '{name}'".format({name:expr.name});
    return FUNCTIONS[expr.name](processor, expr);
  }
  throw "Cannot evaluation expression: "+expr;
}
function register_func(name, min_params, max_params, validator, hasBody, func) {

  FUNCTIONS[name] = (processor, f) => {

    var no_params = f.params ? f.params.length : 0;

    if (!max_params && f.params.length)
      throw 'Function {name} takes no parameters'.format({name:name});
    else if (!(no_params >= min_params && no_params<=max_params))
      throw 'Function {name} takes {n}-{m} parameters got {k}'.format({name:name, n:min_params, m:max_params,  k:no_params});

    if ( hasBody && !f.body ) throw 'Function {name} needs a body'.format({name:name});
    if ( !hasBody && f.body ) throw 'Function {name} does not take a body'.format({name:name});

    params = f.params.map(p => eval_expr(processor, p));

    if (validator instanceof Array)
      params.forEach( (p,i) => {
        if (!(validator[i] || (x=>true))(p) )
          throw 'Function {name} requires {type} parameters, param {i} was {t}'.format({name:name, type: validator.type, i: i, t: typeof p});
      });
    else
      if (!params.every( validator || (x=>true) ))
        throw 'Function {name} requires {type} parameters'.format({name:name, type: validator.type});


    return func.apply( null, [ processor ].concat( params, f.body ? [f.body] : [] ) );

  };
}


register_func('s', 3, 3, isNumericOrRelative, false, func_scale);
register_func('r', 3, 3, isNumeric, false, func_rotate);
register_func('t', 3, 3, isNumericOrRelative, false, func_translate);

register_func('center', 1, 1, isAxis, false, func_center);

register_func('extrude', 1, 1, isNumeric, false, func_extrude);
register_func('taper', 1, 1, isNumeric, false, func_taper);

register_func('rand', 0, 2, isNumeric, false, func_rand);
register_func('set', 2, 2, [ isAttrRef, null ], false, func_set);
register_func('color', 1, 3, [ isStringOrNumeric, isNumeric, isNumeric ], false, func_color);

register_func('split', 1, 1, isAxis, true, func_split);
register_func('comp', 1, 1, isCompSelector, true, func_comp);

register_func('__stack__', 0, 0, null, true, func_stack);

register_func('primitiveCube', 0, 3, isNumeric, false, func_cube);
register_func('primitiveSphere', 0, 3, isNumeric, false, func_sphere);
register_func('primitiveCylinder', 0, 3, isNumeric, false, func_cylinder);


function Processor(grammar) {
  this.data = { cgajs: { maxStackDepth: 50 }};
  this.rules = { NIL : -1 };

  Object.assign(this.data, grammar.attrs);
  grammar.rules.forEach(r => this.rules[r.name] = r);
}

Processor.prototype = {
  get top() {
    if (!this.stack.length) return;
    return peek(this.stack);
  }
};

Processor.prototype.create = function() {
  return this.set_attrs(new THREE.Geometry());
};

Processor.prototype.update_pivot_matrix = function() {
  // recalculate transform matrix from pivot + pivotRotate
  var g = this.top;
  g.pivotTransform.makeRotationFromQuaternion(new THREE.Quaternion().setFromEuler(g.pivotRotate));
  g.pivotTransform.setPosition(g.pivot);
  g.pivotTransformInverse = new THREE.Matrix4().getInverse( g.pivotTransform );
};

Processor.prototype.set_attrs = function (geom) {
  geom.pivot = this.top.pivot.clone();
  geom.pivotRotate = this.top.pivotRotate.clone();
  geom.pivotTransform = this.top.pivotTransform.clone();
  geom.pivotTransformInverse = this.top.pivotTransformInverse.clone();

  geom.attrs = clone_obj(this.top.attrs);
  return geom;
};

Processor.prototype.size = function () {
  this.top.computeBoundingBox();
  return this.top.boundingBox.max.clone().sub(this.top.boundingBox.min);
};

// replace the top of the stack with this geo
Processor.prototype.update = function (g) {
  this.stack.pop();
  this.stack.push(g);
};

Processor.prototype.process = function(lot) {

  this.depth = 0;

  if (lot.faces[0].a !== 0) throw "I assume the first face uses the first vertex!"; // TODO

  var world = new THREE.Matrix4();
  world.makeRotationFromQuaternion(quat_from_first_face(lot));
  world.setPosition( lot.vertices[0] );

  var inverse_world = new THREE.Matrix4();
  inverse_world.getInverse(world, true);

  lot.applyMatrix(inverse_world);

  lot.pivot = new THREE.Vector3(0,0,0);
  lot.pivotRotate = new THREE.Euler(0,0,0);
  lot.pivotTransform = new THREE.Matrix4();
  lot.pivotTransformInverse = new THREE.Matrix4();

  lot.computeFaceNormals();

  this.stack = [lot];

  this.res = [];
  this.applyRule(this.rules.Lot);

  var flat = [];
  function traverse(res) {
    res.forEach( r => {
      if (r instanceof Array)
        traverse(r);
      else if (r !== null)
        flat.push(r);
    });
  }

  traverse(this.res);

  flat.forEach( geo => {
    geo.computeFaceNormals();
    geo.computeVertexNormals();

    geo.applyMatrix( geo.pivotTransform.clone().premultiply( world ) );
  });

  return flat;

};

Processor.prototype.applyStochastic = function(rule) {

  var total = rule.parts.reduce((a,p) => p.pct != 'else' ? a+p.pct : a , 0);
  if (total>100) throw 'Sum of percentages in stochastic rule are >100, was: '+total;

  var otherwise = 100 - total;
  var r = Math.random()*100;
  var k = 0;
  var p;
  for (var i=0; i<rule.parts.length; i++) {
    p = rule.parts[i];
    if (r<k+p.pct) break;
    k += p.pct;
  }

  console.log('r = {r}, picked option {i}'.format({r:r, i:i}));

  this.applyOperations(p.body);
};

Processor.prototype.applyFunction = function(func) {
  if (FUNCTIONS[func.name]) {
      FUNCTIONS[func.name](this, func);
    } else {
      console.log('applying', func.name);
      this.applyRule(this.rules[func.name]);
    }
  };


Processor.prototype.applyOperations = function(ops) {
  var prev = this.res;
  this.res = [];

  ops.forEach( f => this.applyFunction(f) );

  if ( !this.res.length && this.top ) {
    this.res.push(this.top); // implicit leaf
  }

  prev.push(this.res);
  this.res = prev;
};

Processor.prototype.applyRule = function(rule) {

  this.depth ++;
  if (this.depth > this.data.cgajs.maxStackDepth ) {
    console.log("Reached max stack depth, stopping. Increase attr cgajs.maxStackDepth for more!");
    return;
  }

  if (!rule) {
    // leaf
    this.res.push(this.top);
  } else if (rule == -1 ) {
    // nil rule
    this.res.push(null);
  } else if (rule instanceof cga.Rule) {

    if (rule.successors instanceof cga.Stochastic) {
      this.applyStochastic(rule.successors);
    } else {
      this.applyOperations(rule.successors);
    }

  } else {
    throw "Unknown rule type: "+typeof rule;
  }

  this.depth--;
};


module.exports = {
  Processor: Processor,
  _compute_splits: _compute_splits,
};
