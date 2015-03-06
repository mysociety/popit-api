"use strict";

var async = require('async');

function bulkDelete(req, res, next) {
  req.collection.remove(function(err) {
    if (err) {
      return next(err);
    }
    res.send(204);
  });
}

function bulkDeleteAll(req, res, next) {
  var collections = [
    'Person',
    'Organization',
    'Membership',
    'Post',
  ];
  async.each(collections, function deleteCollection(collection, done) {
    req.db.model(collection).remove(done);
  }, function(err) {
    if (err) {
      return next(err);
    }
    res.send(204);
  });
}

function setup(app) {
  app.delete('/:collection', bulkDelete);
  app.delete('/', bulkDeleteAll);
}

module.exports = setup;
