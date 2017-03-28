ls *.js | entr webpack --progress &
echo cgaparser.pegjs | entr pegjs -d cga cgaparser.pegjs &
devd . -o
