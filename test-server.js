"use strict";

var express       = require('express'),
    testServerApp = require('./test-server-app');

var server = express();
server.use(express.logger('dev'));
server.use('/', testServerApp);



server.listen(3000);
console.log('listening on http://0.0.0.0:3000');
