{
}

start = _ attrs:(attr *) rules:(rule *) _ { return new cga.CGA(attrs!==null && attrs.length ? Object.assign.apply({},attrs) : {}, rules); }

_ = ( [ \t\r] / nl )* { return null; }
ws = [ \t]*
indent = [ \t]+ { return text(); }

nl = ( "//" [^\n]* )? "\n"

int = "-"?[0-9]+ { return parseInt(text()) }
float = "-"?[0-9]+ "." [0-9]+ { return parseFloat(text()) }

relative = "'" value:expr { return new cga.Relative( value ); }

floating = "~" value:expr { return new cga.Floating( value ); }

comma = _ "," _

colon = ":"
equals = "="
pipe = "|"
arrow = "-->"

literal = float / int

axis = value:('xyz'/'xz'/'yz'/'xy'/'x'/'y'/'z') { return new cga.Axis(value); }

comp_selector = value:('f'/'e'/'v') { return new cga.CompSelector(value); }

ident = $([a-zA-Z][a-zA-Z0-9]*)

comment
  = "/*" [^*]* "*"+ ([^/*] [^*]* "*"+)* "/"

pct = val:literal "%" { return val; }

else = "else"

func = name:ident args:( "(" _ params:(
      head:func_expr
      tail:(comma v:expr { return v; })* { return [head].concat(tail); } )? _ ")"
      body:block? { return { params:params, body: body }; } )?

      { return new cga.Function(name, args && args.params || [], args && args.body || null); }

block = ws "{" body:( head:block_op tail:(pipe v:block_op { return v; } )* { return [head].concat(tail); } ) "}" repeat:"*"? { return new cga.Body(body, repeat); }

block_op = _ head:expr _ op:(colon/equals) _ operations:operations _ { return new cga.OpBlock(head, op, operations); }

func_expr = axis / comp_selector / expr
body_expr = _ p:(colon / pipe / expr) _ { return p; }

expr = attrref / func / float / int / string / relative / floating

attrref = obj:ident "." field:ident { return new cga.AttrRef(obj, field); }

string = "\"" t:([^"]*{ return text(); })  "\"" { return t; }

attr = "attr" ws variable:attrref _ "=" _ value:literal _ { var res = {}; variable.set(res, value); return res; }

stack = "[" e:( _ e:expr _ { return e; } )* "]" { return new cga.Function('__stack__', [], e); }

pctblock = pct:pct ws colon ws body:stochasticoperations { return { pct: pct, body: body }; }

stochastic = ws nl indent:indent head:pctblock
           tail:(nl indentother:indent & { return indent == indentother; } b:pctblock { return b; } )*
           nl indentelse:indent & { return indent == indentelse; } else_:( else ws colon ws body:stochasticoperations { return { pct: 'else', body: body }; } ) { return new cga.Stochastic([head].concat(tail, [else_])) ; }

// no nl as whitespace
stochasticoperation = stack / func
stochasticoperations = (e:operation ws !arrow !else { return e; } )+

operation = stack / func
operations = (_ e:operation _ !arrow !else { return e; } ) *

// ( "(" ident ( "," ident ) * ")" ) ?
rule = _ name:ident  _ arrow successors:(stochastic / operations ) { return new cga.Rule( name, successors ); }
