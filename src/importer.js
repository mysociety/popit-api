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
  var stats = {};
  async.each(collections, function(collectionPair, done) {
    var key = collectionPair[0];
    var modelName = collectionPair[1];
    if (!popoloObject[key] || !Array.isArray(popoloObject[key])) {
      return done();
    }
    // Ensure all records have a valid _id field
    popoloObject[key].forEach(populateIdField);
    var Model = connection.model(modelName)
    async.each(popoloObject[key], function(doc, next) {
      Model.findByIdAndUpdate(doc._id, doc, {upsert: true}, function(err) {
        if (err) {
          // TODO Make this error more specific
          return next(err);
        }
        stats[key] = stats[key] || 0;
        stats[key]++;
        next();
      });
    }, function(err) {
      if (err) {
        return done(err);
      }
      Model.reIndex(done);
    });
  }, function(err) {
    if (err) {
      return callback(err);
    }
    callback(null, stats);
  });
}

module.exports = importer;
