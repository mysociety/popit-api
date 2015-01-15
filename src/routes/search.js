"use strict";

var paginate = require('../paginate');
var async = require('async');
var InvalidQueryError = require('../mongoose/elasticsearch').InvalidQueryError;

module.exports = function(app) {

  app.get('/search/:collection', function(req, res, next) {
    var pagination = paginate(req.query);
    req.collection.search(req.query, function(err, result) {
      if (err instanceof InvalidQueryError) {
        // Send a 400 error to indicate the client needs to alter their request
        return res.send(400, {errors: [err.message, err.explaination]});
      }
      if (err) {
        return next(err);
      }

      var docs = result.hits.hits.map(function(doc) {
        return new req.collection(doc._source);
      });

      async.each(docs, function(doc, done) {
        doc.embedDocuments(req.query.embed, function() {
          doc.correctDates(done);
        });
      }, function(err) {
        if (err) {
          return next(err);
        }

        var body = pagination.metadata(result.hits.total, req.currentUrl);
        body.result = docs;
        res.jsonp(body);
      });
    });
  });
};
