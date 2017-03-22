var cga = require("./cga");
var THREE = require('three');


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

    geometry.faces.push( new THREE.Face3(l+3, l+4, l+5) );

    geometry.faces.push( new THREE.Face3(l+0, l+4, l+3) );
    geometry.faces.push( new THREE.Face3(l+1, l+4, l+0) );

    geometry.faces.push( new THREE.Face3(l+0, l+3, l+5) );
    geometry.faces.push( new THREE.Face3(l+0, l+5, l+2) );

    geometry.faces.push( new THREE.Face3(l+1, l+5, l+4) );
    geometry.faces.push( new THREE.Face3(l+1, l+2, l+5) );


  });
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
    res.push(cur.size.size);

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

var FUNCTIONS = { };


function isNumeric(n) {
  isNumeric.type = 'numeric';
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function isRelative(val) {
  isRelative.type = 'relative';
  return val instanceof cga.Relative;
}

function isFunction(val) {
  isFunction.type = 'function';
  return val instanceof cga.Function;
}

function eval_expr(expr) {
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
};
