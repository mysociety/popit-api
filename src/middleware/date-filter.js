"use strict";

var eachSchema = require('../utils').eachSchema;

function dateFilterMiddleware(req, res, next) {
  eachSchema(req.db, function(schema) {
    schema.options.toJSON.at = null;
  });

  if (!req.query.at) {
    return next();
  }

  var at = new Date(req.query.at);
  eachSchema(req.db, function(schema) {
    schema.options.toJSON.at = at;
  });
  next();
}

module.exports = dateFilterMiddleware;
