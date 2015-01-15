"use strict";

var express = require('express');
var reIndex = require('./src/reindex');
var api_01 = require('./src/versions/0.1');


module.exports = popitApiApp;

// Expose the reIndex function so popit UI can use it.
popitApiApp.reIndex = reIndex;

function popitApiApp(options) {
  var app = express();

  var app_api_01 = api_01(options);

  app.use('/v0.1', app_api_01);

  return app;
}
