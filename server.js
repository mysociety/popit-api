"use strict";

var express    = require('express'),
    serverApp  = require('./server-app');

serverApp.use(express.logger('dev'));

serverApp.listen(3000);
console.log('listening on http://0.0.0.0:3000');
