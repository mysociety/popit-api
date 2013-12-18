"use strict";

var assert = require('assert');
var slugify = require('underscore.string').slugify;
var mongoose = require('mongoose');
var slugToDb = require('../slug-to-database');

var connections = {};

/**
 * The are the various storage selectors which define what the database is called
 * and how that name is derived.
 *
 * Each selector takes an options object and returns an object with a `selector`
 * property, which should be a piece of middleware that sets `req.db` to be
 * a mongoose connection object.
 */
var storageSelectors = {
  fixedName: function(options) {
    return {
      selector: function (req, res, next) {
        var databaseName = options.databaseName;
        if (!connections[databaseName]) {
          connections[databaseName] = mongoose.createConnection('mongodb://localhost/' + databaseName);
        }
        req.db = connections[databaseName];
        next();
      },
      optionsCheck: function (options) {
        assert(options.databaseName, "Missing required option 'databaseName'");
      }
    };
  },
  hostName: function() {
    return {
      selector: function (req, res, next) {
        var host = req.host.replace(/\./g, '-');
        var databaseName = slugToDb('popit-api-' + slugify(host));
        if (!connections[databaseName]) {
          connections[databaseName] = mongoose.createConnection('mongodb://localhost/' + databaseName);
        }
        req.db = connections[databaseName];
        next();
      }
    };
  }
};

/**
 * Takes the given options and returns a piece of express middleware which
 * will automatically setup the storage for each request.
 *
 * @param {object} options The options to configure the storage.
 * @return {function} The middleware to add to express.
 */
function storageSelector(options) {
  // check that we have all the options that we need
  var storage = storageSelectors[options.storageSelector];
  assert(storage, "Could not load storage selector '"+options.storageSelector+"'");
  storage = storage(options);
  if (storage.optionsCheck) {
    storage.optionsCheck(options);
  }
  return storage.selector;
}

module.exports = storageSelector;
