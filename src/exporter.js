"use strict";

var async = require('async');
require('./models');

/**
 * Takes a mongoose connection and returns an object with all the collections
 * to the callback.
 *
 * @param {Connection} connection A mongoose connection object
 * @param {function} callback The function to call with the exported object
 */
function exporter(connection, callback) {
  function exportCollection(name) {
    return function(done) {
      connection.model(name).find({}, {memberships: 0}, done);
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
