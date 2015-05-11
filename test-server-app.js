"use strict";

var express  = require('express'),
    apiApp   = require('./'),
    defaults = require('./test/defaults');

var app = module.exports = express();

// Use vhost to route to the correct app
app.use('/api', apiApp({
  databaseName: defaults.databaseName,
}));
