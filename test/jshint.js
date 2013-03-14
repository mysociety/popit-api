"use strict";

var JSHINT = require("jshint").JSHINT,
    assert = require("assert"),
    glob   = require("glob"),
    path   = require("path"),
    fs     = require("fs");


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

      var success = JSHINT(
        content,
        jshintConfig
      );

      var errorMessage = "";
      if (!success) {
        // console.log(JSHINT.errors[0]);
        errorMessage = "line " + JSHINT.errors[0].line + ": " + JSHINT.errors[0].raw;
      }

      assert.ok(success, errorMessage);
    });
  });

});
