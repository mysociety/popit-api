"use strict";

var _ = require('underscore');

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
  var hidden = req.storage.db.collection('hidden');
  // Admin can see any fields.
  if (req.isAdmin) {
    return next();
  }

  req.fields = {};

  hidden.find({collection: req.params.collection}, function(err, hiddenDoc) {
    if (err) {
      return next(err);
    }
    hiddenDoc.toArray(function(err, docs) {
      if (err) {
        return next(err);
      }

      docs.forEach(function(doc) {
        req.fields = _.extend(req.fields, doc.fields);
      });
      next();
    });

  });
}

module.exports = hiddenFields;
