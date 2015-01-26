"use strict";

var _ = require('underscore');
var async = require('async');
var InvalidQueryError = require('../mongoose/elasticsearch').InvalidQueryError;

module.exports = function(app) {

  // TODO:
  // organization query param
  // organization date ( defaults to today if missed
  // check birth and death date range

  //also want resolve org?
  app.get('/:collection/resolve', function(req, res, next) {
    req.collection.resolve(req.query, function(err, result) {
      if (err instanceof InvalidQueryError) {
        // Send a 400 error to indicate the client needs to alter their request
        return res.send(400, {errors: [err.message, err.explaination]});
      }
      if (err) {
        return next(err);
      }

      var seen = {};
      result.hits.hits.forEach(function(doc) {
        if ( !seen[doc._source.id] || seen[doc._source.id].score > doc._score ) {
          var new_doc = doc._source;
          new_doc.score = doc._score;
          seen[doc._source.id] = req.collection(new_doc);
        }
      });
      var docs = _.sortBy(_.values(seen), function(value) { return value.get('score'); } ).reverse();
      async.each(docs, function(doc, done) {
        doc.correctDates(function() {
          doc.removeAltNames(done);
        });
      }, function(err) {
        if (err) {
          return next(err);
        }

        var body = { result: docs };
        res.jsonp(body);
      });
    });
  });
};
