"use strict";

var async = require('async');
var mongoose = require('mongoose');
require('./models');

function generateID() {
  var objectId = new mongoose.Types.ObjectId();
  return objectId.toHexString();
}

function populateIdField(record) {
  if (record._id) {
    return;
  }
  if (record.id) {
    record._id = record.id;
  } else {
    record._id = generateID();
  }
}

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
    // Ensure all records have a valid _id field
    popoloObject[key].forEach(populateIdField);
    connection.model(modelName).create(popoloObject[key], done);
  }, callback);
}

module.exports = importer;
