ls *.js | entr webpack &
echo cgaparser.pegjs | entr pegjs -d cga cgaparser.pegjs &
devd . -o
