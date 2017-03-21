var cga = require("./cga");
var THREE = require("three/build/three.min");

function func_extrude(input, amount) {

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

function func_scale(input, x,y,z) {
  // this gets relative objects
  return input.clone().scale(x.value, y.value, z.value);
}

function func_translate(input, x,y,z) {
  return input.clone().translate(x,y,z);
}

function func_rotate(input, x,y,z) {
  return input.clone().rotateX(THREE.Math.degToRad(x))
    .rotateY(THREE.Math.degToRad(y))
    .rotateZ(THREE.Math.degToRad(z));
}

function func_rand(_, min, max) {
  if (!max) { max = min; min = null; }
  if (!min) min = 0;
  if (!max) max = 1;
  return min + Math.random()*(max-min);
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

  FUNCTIONS[name] = (geometry, f) => {

    var no_params = f.params ? f.params.length : 0;

    if (!max_params && f.params.length)
      throw 'Function {name} takes no parameters'.format({name:name});
    else if (!(no_params >= min_params && no_params<=max_params))
      throw 'Function {name} takes {n}-{m} parameters got {k}'.format({name:name, n:min_params, m:max_params,  k:no_params});

    if ( hasBody && !f.body ) throw 'Function {name} needs a body'.format({name:name});
    if ( !hasBody && f.body ) throw 'Function {name} does not take a body'.format({name:name});

    params = f.params.map(eval_expr);

    if (!params.every(validator)) throw 'Function {name} requires {type} parameters'.format({name:name, type: validator.type});

    return func.apply( null, [ geometry ].concat( params ) );

  };
}


register_func('s', 3, 3, isRelative, false, func_scale);
register_func('r', 3, 3, isNumeric, false, func_rotate);
register_func('t', 3, 3, isNumeric, false, func_translate);
register_func('extrude', 1, 1, isNumeric, false, func_extrude);
register_func('rand', 0, 2, isNumeric, false, func_rand);

function process(grammar, lot) {
  var res = [];
  var data = {};
  var rules = {};

  function applyFunction(geometry, func) {
    if (FUNCTIONS[func.name]) {
      return FUNCTIONS[func.name](geometry, func);
    } else {
      if (func.params === null) {
        return applyRule(rules[func.name], geometry);
      }
    }
    throw 'Unknown function: '+func.name;
  }

  function applyRule(rule, geometry) {
    if (!rule) {
      // leaf
      res.push(geometry.clone());
      return geometry;
    } else if (rule instanceof cga.Rule) {
      return rule.successors.reduce(applyFunction, geometry);
    } else {
      throw "Unknown rule type: "+typeof rule;
    }
  }

  Object.assign(data, grammar.attr);
  grammar.rules.forEach(r => rules[r.name] = r);
  var last = applyRule(rules.Lot, lot);
  if ( !res.length || res[res.length-1] != last ) res.push(last);

  return res;

}

module.exports = {
  process: process
};
