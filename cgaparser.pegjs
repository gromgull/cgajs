{
}

start = _ attrs:(attr *) rules:(rule *) _ { return new cga.CGA(attrs!==null && attrs.length ? Object.assign.apply({},attrs) : {}, rules); }

_ = [ \t\r\n]*
ws = [ \t]
nl = "\n"

int = "-"?[0-9]+ { return parseInt(text()) }
float = "-"?[0-9]+ "." [0-9]+ { return parseFloat(text()) }

relative = "'" value:expr { return new cga.Relative( value ); }

floating = "'" value:expr { return new cga.Floating( value ); }

comma = _ "," _

colon = ":"
pipe = "|"

literal = float / int

axis = value:('x'/'y'/'z'/'xy'/'xz'/'yz'/'xyz') { return new cga.Axis(value); }

ident = $([a-zA-Z][a-zA-Z0-9]*)

comment
  = "/*" [^*]* "*"+ ([^/*] [^*]* "*"+)* "/"

func = name:ident params:( "(" _
      head:func_expr
      tail:(comma v:expr { return v; })* _ ")"
      { return [head].concat(tail); }  )? _
      body:( "{" body:( body_expr * ) "}" repeat:"*"? { return new cga.Body(body, repeat); } )?

      { return new cga.Function(name, params, body ); }

func_expr = axis / expr
body_expr = _ p:(colon / pipe / expr) _ { return p; }

expr = func / float / int / relative

attr = "attr" ws variable:ident _ "=" _ value:literal _ { var res = {}; res[variable] = value; return res; }

// ( "(" ident ( "," ident ) * ")" ) ?
rule = name:ident  _ "-->" successors:((_ e: expr { return e } ) *) { return new cga.Rule( name, successors ); }
