"use strict";

var JSHINT = require("jshint").JSHINT,
    assert = require("assert"),
    glob   = require("glob"),
    path   = require("path"),
    fs     = require("fs"),
    _      = require('underscore');


var projectDir = path.normalize(path.join(__dirname, '..'));

var jsFiles = glob.sync(
  "**/*.js",
  { cwd: projectDir }
);

var jshintrc = path.join(projectDir, '.jshintrc');
var jshintConfig = JSON.parse(fs.readFileSync(jshintrc).toString());

describe("Run jsHint on", function () {

  jsFiles.forEach(function (file) {

    if (/node_modules/.test(file)) {
      return;
    }

    it(file, function () {
      var content = fs.readFileSync(path.join(projectDir, file)).toString();

      // Split the content into lines and replace whitespace only lines with
      // empty strings so that this test behaviour mimics that of the command
      // line tool.
      var lines = _.map(
        content.split(/[\n\r]/),
        function (line) {
          return (/^\s+$/).test(line) ? '' : line;
        }
      );
      
      var success = JSHINT(
        lines,
        jshintConfig
      );

      var errorMessage = "";
      if (!success) {
        var error = JSHINT.data().errors[0];
        // console.log(error);
        errorMessage = "line " + error.line + ": " + error.reason;
      }

      assert.ok(success, errorMessage);
    });
  });

});
