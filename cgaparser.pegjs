{
}

start = _ attrs:(attr *) rules:(rule *) _ { return new cga.CGA(attrs!==null && attrs.length ? Object.assign.apply({},attrs) : {}, rules); }

_ = [ \t\r\n]*
ws = [ \t]
nl = "\n"

int = "-"?[0-9]+ { return parseInt(text()) }
float = "-"?[0-9]+ "." [0-9]+ { return parseFloat(text()) }

relative = "'" value:( float / int ) { return new cga.Relative( value ); }

floating = "'" value:( float / int ) { return new cga.Floating( value ); }

comma = _ "," _

colon = ":"

literal = float / int

axis = 'x'/'y'/'z'/'xy'/'xz'/'yz'/'xyz'

ident = $([a-zA-Z][a-zA-Z0-9]*)

comment
  = "/*" [^*]* "*"+ ([^/*] [^*]* "*"+)* "/"

func = name:ident params:( "(" _
      head:expr
      tail:(comma v:expr { return v; })* _ ")"
      { return [head].concat(tail); }  )? _
      body:( "{" body:( body_expr * ) "}" { return body; } )?

      { return new cga.Function(name, params, body ); }

body_expr = _ p:(colon / expr) _ { return p; }

expr = func / float / int / relative / axis

attr = "attr" ws variable:ident _ "=" _ value:literal _ { var res = {}; res[variable] = value; return res; }

// ( "(" ident ( "," ident ) * ")" ) ?
rule = name:ident  _ "-->" successors:((_ e: expr { return e } ) *) { return new cga.Rule( name, successors ); }
