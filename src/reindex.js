"use strict";

var mongoose = require('mongoose');
var async = require('async');
var slugToDatabase = require('./slug-to-database');
require('./models');

module.exports = reIndex;

/**
 * Re-index the database given into elasticsearch.
 *
 * @param {String} databaseName Database to reindex
 * @param {Function} callback Function to call when finished.
 */
function reIndex(databaseName, callback) {
  var connection = mongoose.createConnection('mongodb://localhost/' + slugToDatabase(databaseName));

  var Person = connection.model('Person');
  var Organization = connection.model('Organization');
  var Membership = connection.model('Membership');
  var Post = connection.model('Post');

  // Drop the index for the whole instance (Person model is just a
  // handy way to access the method).
  // TODO: does this drop the name resolution index?
  Person.dropIndex(function(err) {
    if (err) {
      return callback(err);
    }
    Person.reResolveIndex(function(err) {
      if (err) {
        return callback(err);
      }
      async.mapSeries([Person, Organization, Membership, Post], function(Model, done) {
        Model.reIndex(done);
      }, function(err, counts) {
        if (err) {
          return callback(err);
        }
        var total = counts.reduce(function(previous, current) {
          return previous + current;
        });
        connection.close(function(err) {
          callback(err, total);
        });
      });
    });
  });
}
