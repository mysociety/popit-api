"use strict";

var _ = require('underscore');
var async = require('async');

/**
 * Hidden fields middleware.
 *
 * This piece of middleware handles field visibility on the models. It looks for
 * documents that match the current collection and if it finds any field specs then
 * it exposes them on `req.fields`.
 *
 * The fields spec is passed directly to mongo's `find` method, which accepts fields
 * as its second argument and retricts the returned documents based on that.
 *
 * @param {object} req The express request object
 * @param {object} res The express response object
 * @param {object} next The express next function
 */
function hiddenFields(req, res, next) {
  req.fields = {};

  // Admin can see any fields.
  if (req.isAdmin) {
    return next();
  }

  var hidden = req.storage.db.collection('hidden');

  // Find collections that have hidden fields.
  function hiddenCollections(callback) {
    hidden.find({collection: req.params.collection, doc: null}, function(err, hiddenDocs) {
      if (err) {
        return callback(err);
      }
      hiddenDocs.toArray(callback);
    });
  }

  // Find documents that have hidden fields
  function hiddenDocuments(callback) {
    hidden.find({collection: req.params.collection, doc: req.params.id}, function(err, hiddenDocs) {
      if (err) {
        return callback(err);
      }
      hiddenDocs.toArray(callback);
    });
  }

  async.parallel([hiddenCollections, hiddenDocuments], function(err, results) {
    if (err) {
      return next(err);
    }

    var docs = _.flatten(results);

    docs.forEach(function(doc) {
      req.fields = _.extend(req.fields, doc.fields);
    });

    next();
  });
}

module.exports = hiddenFields;
