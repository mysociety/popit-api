"use strict";

var cors = require('cors');

var originWhitelist = [
  'http://openpoliticians.org',
  'http://localhost:4000',
];

var openPoliticiansCors = cors({
  origin: function(origin, callback) {
    var originIsWhitelisted = originWhitelist.indexOf(origin) !== -1;
    callback(null, originIsWhitelisted);
  },
  credentials: true,
});

module.exports = openPoliticiansCors;
