var cga = require("./cga");
var THREE = require('three');
var THREEBSP = require('./three-csg');

var find_hard_edges = require('./edgespolygons.js').find_hard_edges;

function peek(arr) {
  return arr[arr.length-1];
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

function split_geometry(axis, geometry, left, right) {

  var leftbox, rightbox, offset;

  if (!geometry.faces.length) return geometry;

  geometry.computeBoundingBox();

  _g = new THREEBSP(geometry);

  var bb = geometry.boundingBox.max.clone().sub(geometry.boundingBox.min);

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

function func_extrude(processor, amount) {

  var geometry = new THREE.Geometry();
  geometry.attrs = clone_obj(processor.top.attrs);

  var hard_edges = find_hard_edges(processor.top);

  processor.top.faces.forEach(f => {
    var l = geometry.vertices.length;

    geometry.vertices.push( processor.top.vertices[f.a] );
    geometry.vertices.push( processor.top.vertices[f.b] );
    geometry.vertices.push( processor.top.vertices[f.c] );

    var extrude = v => v.clone().addScaledVector(f.normal, amount);

    geometry.vertices.push( extrude(processor.top.vertices[f.a] ));
    geometry.vertices.push( extrude(processor.top.vertices[f.b] ));
    geometry.vertices.push( extrude(processor.top.vertices[f.c] ));

    // bottom
    geometry.faces.push( new THREE.Face3(l+0, l+2, l+1) );

    // top
    geometry.faces.push( new THREE.Face3(l+3, l+4, l+5) );

    // a-b
    if (hard_edges[f.a+','+f.b]) {
      geometry.faces.push( new THREE.Face3(l+0, l+4, l+3) );
      geometry.faces.push( new THREE.Face3(l+1, l+4, l+0) );
    }

    // a-c
    if (hard_edges[f.a+','+f.c]) {
      geometry.faces.push( new THREE.Face3(l+0, l+3, l+5) );
      geometry.faces.push( new THREE.Face3(l+0, l+5, l+2) );
    }

    // b-c
    if (hard_edges[f.b+','+f.c]) {
      geometry.faces.push( new THREE.Face3(l+1, l+5, l+4) );
      geometry.faces.push( new THREE.Face3(l+1, l+2, l+5) );
    }


  });
  console.log("From {v}/{f} vertices/faces, extruded {nv}/{nf}".format({v: processor.top.vertices.length, f: processor.top.faces.length,
                                                                        nv: geometry.vertices.length, nf: geometry.vertices.length }));

  processor.update( geometry );

}

function func_taper(processor, amount) {

  geometry = new THREE.Geometry();
  geometry.attrs = clone_obj(processor.top.attrs);

  var hard_edges = find_hard_edges(processor.top);

  processor.top.computeBoundingBox();
  processor.top.computeFaceNormals();

  var c = processor.top.boundingBox.getCenter();

  processor.top.faces.forEach( f => {

    var l = geometry.vertices.length;

    var v = c.clone().addScaledVector(f.normal, amount);

    geometry.vertices.push( processor.top.vertices[f.a] );
    geometry.vertices.push( processor.top.vertices[f.b] );
    geometry.vertices.push( processor.top.vertices[f.c] );
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
  // this gets relative objects
  processor.top.scale(x.value, y.value, z.value);
}

function func_translate(processor, x,y,z) {
  processor.top.translate(x,y,z);
}

function func_rotate(processor, x,y,z) {
  processor.top.rotateX(THREE.Math.degToRad(x))
    .rotateY(THREE.Math.degToRad(y))
    .rotateZ(THREE.Math.degToRad(z));
}

function func_rand(processor, _, min, max) {
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

  processor.top.computeBoundingBox();
  var size = processor.top.boundingBox.max[axis.value]-processor.top.boundingBox.min[axis.value];

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
    var geom = split_geometry(axis.value, processor.top, left, left+s);
    geom.attrs = clone_obj(processor.top.attrs);
    processor.stack.push(geom);
    processor.applyOperations(sizes[i%sizes.length].operations);
    processor.stack.pop();
    left += s;
  });

}

function func_comp(processor, selector, body) {

  if (selector.value != 'f') throw 'Illegal comp-selector: {axis}, can only comp by fz'.format({axis:axis});

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

  parts.side = [].concat( parts.left || [], parts.right || [], parts.back || []);

  console.log("Compo found these parts:");
  Object.keys(parts).forEach(p => console.log(p, parts[p].length));

  body.parts.forEach( p => {
    if (p.op != ':' ) throw 'Illegal split operator, must be : was "{op}"'.format(p);

    if (parts[p.head.name]) {
      var g = new THREE.Geometry();
      parts[p.head.name].forEach( f => {
        var l = g.vertices.length;
        g.vertices.push(processor.top.vertices[f.a]);
        g.vertices.push(processor.top.vertices[f.b]);
        g.vertices.push(processor.top.vertices[f.c]);
        g.faces.push(new THREE.Face3(l+0,l+1,l+2));

      });

      g.mergeVertices();

      processor.stack.push(g);
      processor.applyOperations(p.operations);
      processor.stack.pop();
    }


  });


}


function func_set(processor, attr, val) {
  if (!processor.top.attrs) processor.top.attrs = {};
  if (!processor.top.attrs[attr.obj]) processor.top.attrs[attr.obj] = {};

  if (val.indexOf('0x') === 0) val = parseInt(val, 16);
  processor.top.attrs[attr.obj][attr.field] = val;
}

function func_color(processor, val) {
  func_set(processor, new cga.AttrRef('material', 'color'), val);
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
      if (!params.every( validator ))
        throw 'Function {name} requires {type} parameters'.format({name:name, type: validator.type});


    return func.apply( null, [ processor ].concat( params, [f.body] ) );

  };
}


register_func('s', 3, 3, isRelative, false, func_scale);
register_func('r', 3, 3, isNumeric, false, func_rotate);
register_func('t', 3, 3, isNumeric, false, func_translate);
register_func('extrude', 1, 1, isNumeric, false, func_extrude);
register_func('taper', 1, 1, isNumeric, false, func_taper);
register_func('rand', 0, 2, isNumeric, false, func_rand);
register_func('set', 2, 2, [ isAttrRef, null ], false, func_set);
register_func('color', 1, 1, isString, false, func_color);

register_func('split', 1, 1, isAxis, true, func_split);
register_func('comp', 1, 1, isCompSelector, true, func_comp);

function Processor(grammar) {
  this.data = {};
  this.rules = {};

  Object.assign(this.data, grammar.attr);
  grammar.rules.forEach(r => this.rules[r.name] = r);
}

Processor.prototype = {
  get top() {
    if (!this.stack.length) return;
    return peek(this.stack);
  }
};

// replace the top of the stack with this geo
Processor.prototype.update = function (g) {
  this.stack.pop();
  this.stack.push(g);
};

Processor.prototype.process = function(lot) {
  this.stack = [lot];

  this.res = [];
  this.applyRule(this.rules.Lot);

  var flat = [];
  function traverse(res) {
    res.forEach( r => {
      if (r instanceof Array)
        traverse(r);
      else
        flat.push(r);
    });
  }

  traverse(this.res);

  return flat;

};

Processor.prototype.applyFunction = function(func) {
    if (FUNCTIONS[func.name]) {
      return FUNCTIONS[func.name](this, func);
    } else {
      if (func.params === null) {
        console.log('applying', func.name);
        return this.applyRule(this.rules[func.name]);
      }
    }
    throw 'Unknown function: '+func.name;
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

  if (!rule) {
    // leaf
    this.res.push(this.top);
  } else if (rule instanceof cga.Rule) {
    this.applyOperations(rule.successors);
  } else {
    throw "Unknown rule type: "+typeof rule;
  }

};


module.exports = {
  Processor: Processor,
  _compute_splits: _compute_splits,
  split_geometry: split_geometry,
};
