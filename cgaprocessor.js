var cga = require("./cga");
var THREE = require("three/three.min");

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
  return input.clone().scale(x,y,z);
}

function func_translate(input, x,y,z) {
  return input.clone().translate(x,y,z);
}

function func_rotate(input, x,y,z) {
  return input.clone().rotateX(THREE.Math.degToRad(x))
    .rotateY(THREE.Math.degToRad(y))
    .rotateZ(THREE.Math.degToRad(z));
}


function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function process(grammar, lot) {
  var res = [];
  var data = {};
  var rules = {};

  function applyFunction(geometry, func) {
    if (func.name == 's') {
      if (!func.params || func.params.length!=3) throw 's function takes 3 parameters';
      if (!func.params.every( p => p instanceof cga.Relative )) throw 'Only relative scaling supported';
      return func_scale(geometry, func.params[0].value, func.params[1].value, func.params[2].value);

    } else if (func.name == 't') {
      if (!func.params || func.params.length!=3) throw 't function takes 3 parameters';
      if (!func.params.every( p => isNumeric(p) )) throw 'Only translating by literal numbers is supported';
      return func_translate(geometry, func.params[0], func.params[1], func.params[2]);

    } else if (func.name == 'r') {
      if (!func.params || func.params.length!=3) throw 'r function takes 3 parameters';
      if (!func.params.every( p => isNumeric(p) )) throw 'Only rotating by literal numbers is supported';
      return func_rotate(geometry, func.params[0], func.params[1], func.params[2]);

    } else if (func.name == 'extrude') {
      if (func.params.length!=1) throw 'extrude function takes 1 parameters';
      return func_extrude(geometry, func.params[0].value);
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
