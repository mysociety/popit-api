"use strict";

var eachSchema = require('../utils').eachSchema;

function i18n(defaultLanguage) {
  defaultLanguage = defaultLanguage || 'en';
  eachSchema(function(schema) {
    schema.options.toJSON.defaultLanguage = defaultLanguage;
  });
  return function i18nMiddleware(req, res, next) {
    req.langs = (req.accept && req.accept.languages);
    req.defaultLanguage = defaultLanguage;
    next();
  };
}

module.exports = i18n;
