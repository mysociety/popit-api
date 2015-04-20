"use strict";

var async = require('async');
var transform = require('./transform');
require('./models');

/**
 * Takes a mongoose connection and returns an object with all the collections
 * to the callback.
 *
 * @param {Connection} connection A mongoose connection object
 * @param {function} callback The function to call with the exported object
 */
function exporter(connection, options, callback) {
  function exportCollection(name) {
    return function(done) {
      connection.model(name).find({}, {memberships: 0}, function(err, docs) {
        if (err) {
          return done(err);
        }
        async.map(docs, function(doc, next) {
          next(null, transform(doc, options));
        }, done);
      });
    };
  }

  async.parallel({
    persons: exportCollection('Person'),
    organizations: exportCollection('Organization'),
    memberships: exportCollection('Membership'),
    posts: exportCollection('Post'),
  }, callback);
}

module.exports = exporter;
