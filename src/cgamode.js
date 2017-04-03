var CodeMirror = require("codemirror");

CodeMirror.defineMode("cga", function (config) {

  function identifier(stream) {
    return stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
  }

  function floating(stream) {
    return stream.match(/^~[0-9]+(?:\.[0-9]+)?/);
  }

  function relative(stream) {
    return stream.match(/^'[0-9]+(?:\.[0-9]+)?/);
  }

  return {
    startState: function () {
      return {
        inString: false,
        stringType: null,
        inComment: false,
        inCharacterClass: false,
        braced: 0,
        lhs: true,
        localState: null
      };
    },
    token: function (stream, state) {
      if (stream)

      //check for state changes
      if (!state.inString && !state.inComment && ((stream.peek() == '"') )) {
        state.stringType = stream.peek();
        stream.next(); // Skip quote
        state.inString = true; // Update state
      }
      if (!state.inString && !state.inComment && stream.match(/^\/\*/)) {
        state.inComment = true;
      }

      //return state
      if (state.inString) {
        while (state.inString && !stream.eol()) {
          if (stream.peek() === state.stringType) {
            stream.next(); // Skip quote
            state.inString = false; // Clear flag
          } else if (stream.peek() === '\\') {
            stream.next();
            stream.next();
          } else {
            stream.match(/^.[^\\\"\']*/);
          }
        }
        return state.lhs ? "property string" : "string"; // Token style
      } else if (state.inComment) {
        while (state.inComment && !stream.eol()) {
          if (stream.match(/\*\//)) {
            state.inComment = false; // Clear flag
          } else {
            stream.match(/^.[^\*]*/);
          }
        }
        return "comment";
      } else if (state.inCharacterClass) {
          while (state.inCharacterClass && !stream.eol()) {
            if (!(stream.match(/^[^\]\\]+/) || stream.match(/^\\./))) {
              state.inCharacterClass = false;
            }
          }
      } else if (stream.peek() === '[') {
        stream.next();
        state.inCharacterClass = true;
        return 'bracket';
      } else if (stream.match(/^\/\//)) {
        stream.skipToEnd();
        return "comment";
      } else if (identifier(stream)) {
        if (stream.peek() === ':') {
          return 'variable';
        }
        return 'variable-2';
      } else if (['[', ']', '(', ')'].indexOf(stream.peek()) != -1) {
        stream.next();
        return 'bracket';
      } else if (floating(stream)) {
        return 'keyword';
      } else if (relative(stream)) {
        return 'number';
      }else if (!stream.eatSpace()) {
        stream.next();
      }
      return null;
    }
  };

});
