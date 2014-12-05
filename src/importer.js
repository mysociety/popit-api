"use strict";

var async = require('async');
require('./models');

function importer(connection, popoloObject, callback) {
  var collections = [
    ['persons', 'Person'],
    ['people', 'Person'],
    ['organizations', 'Organization'],
    ['memberships', 'Membership'],
    ['posts', 'Post'],
  ];
  async.each(collections, function(collectionPair, done) {
    var key = collectionPair[0];
    var modelName = collectionPair[1];
    if (!popoloObject[key] || !Array.isArray(popoloObject[key])) {
      return done();
    }
    connection.model(modelName).create(popoloObject[key], done);
  }, callback);
}

module.exports = importer;
