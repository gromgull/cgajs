This is a JavaScript implementation of the parser, processor and
visualiser for the CGA Shape Grammar language.

For demo and docs see: https://gromgull.github.io/cgajs/

Built with:
* ThreeJS for visualiation
* PegJS for parsing


Development
-----------

* Install dependencies with yarn/npm
* Install webpack and pegjs
* create a symlink to `src/cga.js` in `node_modules`, so we can import it with `require('cga')` (I guess a better way exists).
* `pegjs -d cga src/cgaparser.pegjs` will regenerate the parser.
* `webpack` builds `build/bundle.js`
* I can't get `webpack --watch` to work, and I don't know why, but `dev.sh` uses `entr` to watch the files and trigger the rebuild.
