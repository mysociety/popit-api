"use strict";

var collections = require('../collections');

function dateFilterMiddleware(req, res, next) {
  function eachSchema(callback) {
    for (var key in collections) {
      var schema = req.db.model(collections[key].model).schema;
      callback(schema);
    }
  }

  eachSchema(function(schema) {
    schema.options.toJSON.at = null;
  });

  if (!req.query.at) {
    return next();
  }

  var at = new Date(req.query.at);
  eachSchema(function(schema) {
    schema.options.toJSON.at = at;
  });
  next();
}

module.exports = dateFilterMiddleware;
