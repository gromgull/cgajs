ls src/*.js | entr webpack --progress &
echo src/cgaparser.pegjs | entr pegjs -d cga src/cgaparser.pegjs &
devd . -o
