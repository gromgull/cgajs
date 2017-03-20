function CGA(attrs, rules) {
  this.attrs = attrs;
  this.rules = rules;
}

CGA.prototype.toString = function() {
  return 'CGA( {attr}, {rules})'.format( { attr: JSON.stringify(this.attrs), rules: this.rules } );
};

function Rule(name, successors) {
  this.name = name;
  this.successors = successors;
}

Rule.prototype.toString = function() {
  return 'Rule( {name}, {successors} )'.format( { name: this.name, successors: this.successors.map(JSON.stringify) });
};

function Relative(value) { this.value = value; }
Relative.prototype.toString = function() {
  return 'Relative({value}'.format(this);
};

function Floating(value) { this.value = value; }
Floating.prototype.toString = function() {
  return 'Floating({value}'.format(this);
};


function Function(name, params) { this.name = name; this.params = params;}
Function.prototype.toString = function() {
  return 'Function({name}, {params})'.format(this);
};


module.exports = {
  CGA: CGA,
  Rule: Rule,
  Relative: Relative,
  Function: Function
};
