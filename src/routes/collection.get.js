"use strict";

var async = require('async');
var paginate = require('../paginate');

module.exports = function(app) {

  app.get('/:collection', function (req, res, next) {
    var pagination = paginate(req.query);
    req.collection.find({}, null, pagination, function (err, docs) {
      if (err) {
        return next(err);
      }

      async.each(docs, function(doc, done) {
        doc.embedDocuments(req.query.embed, done);
      }, function(err) {
        if (err) {
          return next(err);
        }

        req.collection.count(function(err, count) {
          if (err) {
            return next(err);
          }
          var body = pagination.metadata(count, req.currentUrl);
          body.result = docs;
          res.jsonp(body);
        });
      });
    });
  });
};
