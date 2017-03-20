var cga = require("./cga");
var THREE = require("three/three.min");

function process(grammar, lot) {
    var data = {};
    var rules = {};

    function applyFunction(geometry, func) {
      if (func.name == 's') {
        if (func.params.length!=3) throw 's function takes 3 parameters';
        if (!func.params.every( p => p instanceof cga.Relative )) throw 'Only relative scaling supported';
        return geometry.clone().scale(func.params[0].value, func.params[1].value, func.params[2].value);
      } else if (func.name == 'extrude') {
        if (func.params.length!=1) throw 'extrude function takes 1 parameters';

        geometry = geometry.clone();
        geometry.faces.forEach(f => {
          var l = geometry.vertices.length;
          var extrude = v => v.clone().addScaledVector(f.normal, func.params[0].value);
          geometry.vertices.push( extrude(geometry.vertices[f.a] ));
          geometry.vertices.push( extrude(geometry.vertices[f.b] ));
          geometry.vertices.push( extrude(geometry.vertices[f.c] ));

          geometry.faces.push( new THREE.Face3(l+0, l+1, l+2) );

          geometry.faces.push( new THREE.Face3(f.a, l+1, l+0) );
          geometry.faces.push( new THREE.Face3(f.b, l+1, f.a) );

          geometry.faces.push( new THREE.Face3(f.a, l+0, l+2) );
          geometry.faces.push( new THREE.Face3(f.a, l+2, f.c) );

          geometry.faces.push( new THREE.Face3(f.b, l+2, l+1) );
          geometry.faces.push( new THREE.Face3(f.b, f.c, l+2) );

          //hmm
        });
        return geometry;
      }
      throw 'Unknown function: '+func.name;
    }

    function applyRule(rule, geometry) {
      if (rule instanceof cga.Rule) {
        return rule.successors.reduce(applyFunction, geometry);
      } else {
        throw "Unknown rule type: "+typeof rule;
      }
    }

    Object.assign(data, grammar.attr);
    grammar.rules.forEach(r => rules[r.name] = r);
    var res = applyRule(rules.Lot, lot);
    return res;

}

module.exports = {
  process: process
};
