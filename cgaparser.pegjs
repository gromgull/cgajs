{
}

start = _ attrs:(attr *) rules:(rule *) _ { return new cga.CGA(attrs!==null && attrs.length ? Object.assign.apply({},attrs) : {}, rules); }

_ = [ \t\r\n]*
ws = [ \t]
nl = "\n"

int = [0-9]+ { return parseInt(text()) }
float = [0-9]+ "." [0-9]+ { return parseFloat(text()) }

relative = "'" value:( float / int ) { return new cga.Relative( value ); }

float = "'" value:( float / int ) { return new cga.Float( value ); }

comma = _ "," _

literal = float / int

axis = 'x'/'y'/'z'/'xy'/'xz'/'yz'/'xyz'

ident = $([a-zA-Z][a-zA-Z0-9]*)

comment
  = "/*" [^*]* "*"+ ([^/*] [^*]* "*"+)* "/"

func = name:ident params:( "("
      head:expr
      tail:(comma v:expr { return v; })* ")"
      { return [head].concat(tail); }  )? { return new cga.Function(name, params ); }

expr = func / float / int / relative

attr = "attr" ws variable:ident _ "=" _ value:literal _ { var res = {}; res[variable] = value; return res; }

// ( "(" ident ( "," ident ) * ")" ) ?
rule = name:ident  _ "-->" successors:((_ e: expr { return e } ) *) { return new cga.Rule( name, successors ); }
