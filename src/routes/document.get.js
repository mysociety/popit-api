"use strict";

var eachSchema = require('../utils').eachSchema;
var InvalidEmbedError = require('../mongoose/embed').InvalidEmbedError;
var transform = require('../transform');

module.exports = function(app) {

  app.get('/:collection/:id/full', function (req, res, next) {
    var id = req.params.id;

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.jsonp(404, {errors: ["id '" + id + "' not found"]});
      }

      eachSchema(req.collection, function(schema) {
        schema.options.toJSON.returnAllTranslations = true;
      });

      res.withBody(transform(doc, req));

      eachSchema(req.collection, function(schema) {
        schema.options.toJSON.returnAllTranslations = false;
      });
    });
  });

  app.get('/:collection/:id', function (req, res, next) {
    var id = req.params.id;

    req.collection.findById(id)
      .exec(function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.jsonp(404, {errors: ["id '" + id + "' not found"]});
      }

      doc.embedDocuments(req, function(err) {
        if (err instanceof InvalidEmbedError) {
          // Send a 400 error to indicate the client needs to alter their request
          return res.send(400, {errors: [err.message, err.explaination]});
        }
        if (err) {
          return next(err);
        }
        res.withBody(transform(doc, req));
      });
    });
  });

};
