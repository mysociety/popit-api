"use strict";

var eachSchema = require('../utils').eachSchema;

function i18n(defaultLanguage) {
  defaultLanguage = defaultLanguage || 'en';
  return function i18nMiddleware(req, res, next) {
    eachSchema(req.db, function(schema) {
      schema.options.toJSON.langs = (req.accept && req.accept.languages);
      schema.options.toJSON.defaultLanguage = defaultLanguage;
    });
    next();
  };
}

module.exports = i18n;
