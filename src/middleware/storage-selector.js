"use strict";

var assert = require('assert');
var slugify = require('underscore.string').slugify;
var mongoose = require('mongoose');
var slugToDb = require('../slug-to-database');

var connections = {};

/**
 * Get or create a mongoose connection for the given name and return it
 *
 * @param {String} databaseName Name of the database to connect to
 * @return {mongoose.Connection} Database connection
 */
function connection(databaseName) {
  if (!connections[databaseName]) {
    connections[databaseName] = mongoose.createConnection('mongodb://localhost/' + databaseName);
  }
  return connections[databaseName];
}

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
        req.db = connection(databaseName);
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
        req.db = connection(databaseName);
        next();
      }
    };
  },
  popit: function(options) {
    return {
      selector: function(req, res, next) {
        var databaseName = options.databasePrefix + req.popit.dbname();
        req.db = connection(databaseName);
        next();
      },
      optionsCheck: function(options) {
        if (!options.databasePrefix) {
          throw new Error("popit storageSelector requires a databasePrefix option");
        }
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
  options.storageSelector = options.storageSelector || 'fixedName';
  var storageFunction = storageSelectors[options.storageSelector];
  if (!storageFunction) {
    throw new Error("Could not load storageSelector '" + options.storageSelector + "'");
  }
  var storage = storageFunction(options);
  if (storage.optionsCheck) {
    storage.optionsCheck(options);
  }
  return storage.selector;
}

module.exports = exports = storageSelector;
exports.connection = connection;
