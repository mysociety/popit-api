"use strict";

var _ = require('underscore');
var async = require('async');

/**
 * Hidden fields middleware.
 *
 * This piece of middleware handles field visibility on the models. It looks for
 * documents that match the current collection and if it finds any field specs then
 * it exposes them to the storage's filter property.
 *
 * The fields spec is passed to mongo's `find` method, which accepts fields
 * as its second argument and retricts the returned documents based on that.
 *
 * Example
 *
 *     app.get('/:collection', hiddenFields, function(req, res, next) {
 *       // fields will be filtered based on the `:collection` param.
 *     });
 *
 * @param {object} req The express request object
 * @param {object} res The express response object
 * @param {object} next The express next function
 */
function hiddenFields(req, res, next) {
  var fields = {
    all: {}
  };
  var schema = req.collection.schema;

  schema.options.toJSON.fields = fields;

  // Admin can see any fields.
  if (req.isAdmin) {
    return next();
  }

  var globallyHidden = req.app.get('fieldSpec');

  if (globallyHidden) {
    globallyHidden.forEach(function(hidden) {
      if (hidden.collectionName === req.params.collection) {
        _.extend(fields.all, hidden.fields);
      }
    });
  }

  var hidden = req.db.model('Hidden');

  async.map([
    {collectionName: req.params.collection, doc: null},
    {collectionName: req.params.collection, doc: {'$ne': null}}
  ], hidden.find.bind(hidden), function(err, results) {
    if (err) {
      return next(err);
    }

    var collectionWide = results[0];
    var documentSpecific = results[1];

    collectionWide.forEach(function(doc) {
      _.extend(fields.all, doc.fields);
    });

    documentSpecific.forEach(function(doc) {
      fields[doc.doc] = doc.fields;
    });

    schema.options.toJSON.fields = fields;

    next();
  });
}

module.exports = hiddenFields;
