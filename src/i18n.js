"use strict";

var _ = require('underscore');
var tags = require('language-tags');

function isValidLanguage(language) {
  return tags.check(language);
}

/**
 * Takes an object and a language and flattens any language keys of
 * that object to use the specified language, or the default one.
 */
function i18n(objectWithLanguages, langs, defaultLang) {
  langs = langs || [];
  var obj = {};
  // Detect keys that need translating
  _.each(objectWithLanguages, function(value, key) {
    if (!_.isObject(value)) {
      obj[key] = value;
      return;
    }

    // Don't translate id fields
    if (key === 'id') {
      obj[key] = value;
      return;
    }

    if (_.isArray(value)) {
      obj[key] = value.map(function(nestedValue) {
        if (_.isObject(nestedValue) && !_.isArray(nestedValue)) {
          return i18n(nestedValue, langs, defaultLang);
        } else {
          return nestedValue;
        }
      });
      return;
    }

    var keys = Object.keys(value);
    if (keys.every(isValidLanguage)) {
      langs.forEach(function(lang) {
        if (value[lang]) {
          obj[key] = value[lang];
          return false;
        }
      });
      if (!obj[key]) {
        obj[key] = value[defaultLang] || '';
      }
    } else {
      obj[key] = i18n(value, langs, defaultLang);
    }
  });
  return obj;
}

module.exports = i18n;
