"use strict";

var express = require('express');
var reIndex = require('./src/reindex');
var api_01 = require('./src/versions/0.1');
var api_1_0_0 = require('./src/versions/1.0.0');


module.exports = popitApiApp;

// Expose the reIndex function so popit UI can use it.
popitApiApp.reIndex = reIndex;

function popitApiApp(options) {
  var app = express();

  var app_api_01 = api_01(options);
  app.use('/v0.1', app_api_01);

  var app_api_1_0_0 = api_1_0_0(options);
  app.use('/v1.0.0', app_api_1_0_0);

  return app;
}
