"use strict";

var collections = require('../collections');

function i18n(defaultLanguage) {
  defaultLanguage = defaultLanguage || 'en';
  return function i18nMiddleware(req, res, next) {
    for (var key in collections) {
      var schema = req.db.model(collections[key].model).schema;

      schema.options.toJSON.langs = (req.accept && req.accept.languages);

      schema.options.toJSON.defaultLanguage = defaultLanguage;
    }

    next();
  };
}

module.exports = i18n;
