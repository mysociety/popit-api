"use strict";

var assert = require('assert');
var slugify = require('underscore.string').slugify;
var Storage = require('../storage');
var slugToDb = require('../slug-to-database');

/**
 * The are the various storage selectors which define what the database is called
 * and how that name is derived.
 *
 * Each selector takes an options object and returns an object with a `selector`
 * property, which should be a piece of middleware that sets `req.storage` to be
 * and instance of the Storage class configured to use a certain database.
 */
var storageSelectors = {
  fixedName: function(options) {
    return {
      selector: function (req, res, next) {
        Storage.connectToDatabase(function (err) {
          if (!err) {
            var databaseName = options.databaseName;
            req.storage = new Storage(databaseName);
          }
          next(err);
        });
      },
      optionsCheck: function (options) {
        assert(options.databaseName, "Missing required option 'databaseName'");
      }
    };
  },
  hostName: function() {
    return {
      selector: function (req, res, next) {
        Storage.connectToDatabase(function (err) {
          if (!err) {
            var host = req.host.replace(/\./g, '-');
            var databaseName = slugToDb('popit-api-' + slugify(host));
            req.storage = new Storage(databaseName);
          }
          next(err);
        });
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
