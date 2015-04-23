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
  console.time('exporter');
  function exportCollection(name) {
    console.time('total ' + name);
    console.time('find all ' + name);
    return function(done) {
      connection.model(name).find({}, {memberships: 0}, function(err, docs) {
        if (err) {
          return done(err);
        }
        console.timeEnd('find all ' + name);
        console.time('transform ' + name);
        async.map(docs, function(doc, next) {
          next(null, transform(doc, options));
        }, function(err, result) {
          console.timeEnd('transform ' + name);
          console.timeEnd('total ' + name);
          done(err, result);
        });
      });
    };
  }

  async.parallel({
    persons: exportCollection('Person'),
    organizations: exportCollection('Organization'),
    memberships: exportCollection('Membership'),
    posts: exportCollection('Post'),
  }, function(err, result) {
    console.timeEnd('exporter');
    callback(err, result);
  });
}

module.exports = exporter;
