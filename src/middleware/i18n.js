"use strict";

var collections = require('../collections');

function i18nMiddleware(req, res, next) {
  for (var key in collections) {
    var schema = req.db.model(collections[key].model).schema;

    // TODO: Use the Accept-Language header to decide this.
    schema.options.toJSON.lang = 'en';

    // TODO: Make this configurable.
    schema.options.toJSON.defaultLang = 'en';
  }

  next();
}

module.exports = i18nMiddleware;
