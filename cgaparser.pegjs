{
}

start = _ attrs:(attr *) rules:(rule *) _ { return new cga.CGA(attrs!==null && attrs.length ? Object.assign.apply({},attrs) : {}, rules); }

_ = [ \t\r\n]*
ws = [ \t]
nl = "\n"

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

axis = value:('x'/'y'/'z'/'xy'/'xz'/'yz'/'xyz') { return new cga.Axis(value); }

comp_selector = value:('f'/'e'/'v') { return new cga.CompSelector(value); }

ident = $([a-zA-Z][a-zA-Z0-9]*)

comment
  = "/*" [^*]* "*"+ ([^/*] [^*]* "*"+)* "/"

func = name:ident params:( "(" _
      head:func_expr
      tail:(comma v:expr { return v; })* _ ")"
      { return [head].concat(tail); }  )? _
      body:block?

      { return new cga.Function(name, params, body ); }

block = "{" body:( head:block_op tail:(pipe v:block_op { return v; } )* { return [head].concat(tail); } ) "}" repeat:"*"? { return new cga.Body(body, repeat); }

block_op = _ head:expr _ op:(colon/equals) _ operations:expr* _ { return new cga.OpBlock(head, op, operations); }

func_expr = axis / comp_selector / expr
body_expr = _ p:(colon / pipe / expr) _ { return p; }

expr = attrref / func / float / int / string / relative / floating

attrref = obj:ident "." field:ident { return new cga.AttrRef(obj, field); }

string = "\"" t:([^"]*{ return text(); })  "\"" { return t; }

attr = "attr" ws variable:ident _ "=" _ value:literal _ { var res = {}; res[variable] = value; return res; }

// ( "(" ident ( "," ident ) * ")" ) ?
rule = name:ident  _ arrow successors:((_ e:expr _ !arrow { return e } ) *) { return new cga.Rule( name, successors ); }
