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

  async.map([Person, Organization, Membership, Post], function(Model, done) {
    Model.reIndex(done);
  }, function(err, counts) {
    if (err) {
      return callback(err);
    }
    var total = counts.reduce(function(previous, current) {
      return previous + current;
    });
    console.log("Re-indexed " + total + " docs from " + databaseName);
    callback();
  });
}
