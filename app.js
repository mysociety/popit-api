"use strict";

var popitApi = require('./');

var port = process.env.PORT || 3000;

var app = popitApi({storageSelector: 'hostName'});

app.listen(port, function() {
  console.log("PopIt API listening on http://0.0.0.0:" + port);
});
