"use strict";

var async = require('async');

function bulkDelete(req, res, next) {
  req.collection.remove(function(err) {
    if (err) {
      return next(err);
    }
    req.collection.deleteFromElasticsearch(function(err) {
      if (err) {
        return next(err);
      }
      res.sendStatus(204);
    });
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
    var Model = req.db.model(collection);
    Model.remove(function(err) {
      if (err) {
        return done(err);
      }
      Model.deleteFromElasticsearch(done);
    });
  }, function(err) {
    if (err) {
      return next(err);
    }
    res.sendStatus(204);
  });
}

function setup(app) {
  app.delete('/:collection', bulkDelete);
  app.delete('/', bulkDeleteAll);
}

module.exports = setup;
