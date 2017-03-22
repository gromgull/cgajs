var cga = require("./cga");
var THREE = require('three');
var THREEBSP = require('./three-csg');


function split_array(a, sep) {
  var res = [], chunk=[];
  a.forEach( e => { if (e!=sep) chunk.push(e); else { res.push(chunk); chunk = []; } });
  if (chunk.length) res.push(chunk);
  return res;
}

function split_geometry(axis, geometry, left, right) {

  var leftbox, rightbox, offset;

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

  console.log('Split {min}, {max} at {left}-{right} and got {newmin}, {newmax}'.format({min: JSON.stringify(geometry.boundingBox.min),
                                                                                        max: JSON.stringify(geometry.boundingBox.max),
                                                                                        left: left,
                                                                                        right: right,
                                                                                        newmin: JSON.stringify(g.boundingBox.min),
                                                                                        newmax: JSON.stringify(g.boundingBox.max) }));

  var used = Array(g.vertices.length);
  g.faces.forEach(f => { used[f.a] = true ; used[f.b] = true ; used[f.c] = true; });
  console.log(used);

  return g;

}

function func_extrude(processor, input, amount) {

  geometry = new THREE.Geometry();
  input.faces.forEach(f => {
    var l = geometry.vertices.length;

    geometry.vertices.push( input.vertices[f.a] );
    geometry.vertices.push( input.vertices[f.b] );
    geometry.vertices.push( input.vertices[f.c] );

    var extrude = v => v.clone().addScaledVector(f.normal, amount);

    geometry.vertices.push( extrude(input.vertices[f.a] ));
    geometry.vertices.push( extrude(input.vertices[f.b] ));
    geometry.vertices.push( extrude(input.vertices[f.c] ));

    // bottom
    geometry.faces.push( new THREE.Face3(l+0, l+2, l+1) );

    // top
    geometry.faces.push( new THREE.Face3(l+3, l+4, l+5) );

    geometry.faces.push( new THREE.Face3(l+0, l+4, l+3) );
    geometry.faces.push( new THREE.Face3(l+1, l+4, l+0) );

    geometry.faces.push( new THREE.Face3(l+0, l+3, l+5) );
    geometry.faces.push( new THREE.Face3(l+0, l+5, l+2) );

    geometry.faces.push( new THREE.Face3(l+1, l+5, l+4) );
    geometry.faces.push( new THREE.Face3(l+1, l+2, l+5) );


  });
  console.log("From {v}/{f} vertices/faces, extruded {nv}/{nf}".format({v: input.vertices.length, f: input.faces.length,
                                                                        nv: geometry.vertices.length, nf: geometry.vertices.length }));
  return geometry;
}

function func_scale(processor, input, x,y,z) {
  // this gets relative objects
  return input.clone().scale(x.value, y.value, z.value);
}

function func_translate(processor, input, x,y,z) {
  return input.clone().translate(x,y,z);
}

function func_rotate(processor, input, x,y,z) {
  return input.clone().rotateX(THREE.Math.degToRad(x))
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
    console.log(current);

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

function func_split(processor, input, axis, body) {

  if ('xyz'.indexOf(axis.value)==-1) throw 'Illegal split-axis: {axis}, can only split by x, y or z'.format({axis:axis});

  input.computeBoundingBox();
  var size = input.boundingBox.max[axis.value]-input.boundingBox.min[axis.value];

  var parts = split_array(body.parts, '|');
  total = 0;
  var sizes = parts.map( p => {
    if (p.length<3) throw 'Size body part too short: '+p;
    if (p[1] != ':') throw 'Badly formed size body part, expected "amount : rules" '+p;
    if (!isValue(p[0])) throw 'Illegal size for split: '+p[0];

    var val = eval_expr(p[0]);
    var floating = false;
    if (isRelative(val)) val = size*val.value;
    if (isFloating(val)) { val = val.value; floating = true; }

    total += val;

    return { size: val, operators: p.slice(2), floating: floating };
  });

  var splits = _compute_splits(sizes, size, body.repeat);

  var left = 0;
  splits.forEach( (s,i) => {
    processor.applyOperators(sizes[i%sizes.length].operators, split_geometry(axis.value, input, left, left+s));
    left += s;
  });

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


function eval_expr(expr) {
  if (isAxis(expr)) return expr;
  if (isNumeric(expr)) return expr;
  if (isRelative(expr)) {
    expr.value = eval_expr(expr.value);
    return expr;
  }
  if (isFunction(expr)) {
    if (!FUNCTIONS[expr.name]) throw "Undefined function '{name}'".format({name:expr.name});
    return FUNCTIONS[expr.name](null, expr); // object in scope?
  }
  throw "Cannot evaluation expression: "+expr;
}
function register_func(name, min_params, max_params, validator, hasBody, func) {

  FUNCTIONS[name] = (processor, geometry, f) => {

    var no_params = f.params ? f.params.length : 0;

    if (!max_params && f.params.length)
      throw 'Function {name} takes no parameters'.format({name:name});
    else if (!(no_params >= min_params && no_params<=max_params))
      throw 'Function {name} takes {n}-{m} parameters got {k}'.format({name:name, n:min_params, m:max_params,  k:no_params});

    if ( hasBody && !f.body ) throw 'Function {name} needs a body'.format({name:name});
    if ( !hasBody && f.body ) throw 'Function {name} does not take a body'.format({name:name});

    params = f.params.map(eval_expr);

    if (!params.every(validator)) throw 'Function {name} requires {type} parameters'.format({name:name, type: validator.type});


    return func.apply( null, [ processor, geometry ].concat( params, [f.body] ) );

  };
}


register_func('s', 3, 3, isRelative, false, func_scale);
register_func('r', 3, 3, isNumeric, false, func_rotate);
register_func('t', 3, 3, isNumeric, false, func_translate);
register_func('extrude', 1, 1, isNumeric, false, func_extrude);
register_func('rand', 0, 2, isNumeric, false, func_rand);

register_func('split', 1, 1, isAxis, true, func_split);

function Processor(grammar) {
  this.data = {};
  this.rules = {};

  Object.assign(this.data, grammar.attr);
  grammar.rules.forEach(r => this.rules[r.name] = r);
}

Processor.prototype.process = function(lot) {
  this.res = [];

  var last = this.applyRule(this.rules.Lot, lot);
  if ( ( !this.res.length || this.res[this.res.length-1] != last ) && last ) this.res.push(last);

  return this.res;

};

Processor.prototype.applyFunction = function(geometry, func) {
    if (FUNCTIONS[func.name]) {
      return FUNCTIONS[func.name](this, geometry, func);
    } else {
      if (func.params === null) {
        return this.applyRule(this.rules[func.name], geometry);
      }
    }
    throw 'Unknown function: '+func.name;
  };

Processor.prototype.applyOperators = function(ops, geometry) {
  return ops.reduce((g, f) => this.applyFunction(g,f), geometry);
};

Processor.prototype.applyRule = function(rule, geometry) {
  if (!rule) {
    // leaf
    this.res.push(geometry.clone());
    return geometry;
  } else if (rule instanceof cga.Rule) {
    return this.applyOperators(rule.successors, geometry);
  } else {
    throw "Unknown rule type: "+typeof rule;
  }
};


module.exports = {
  Processor: Processor,
  _compute_splits: _compute_splits,
  split_geometry: split_geometry,
};
