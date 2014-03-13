"use strict";

var _ = require('underscore');

/**
 * Takes an object and a language and flattens any language keys of
 * that object to use the specified language, or the default one.
 */
function i18n(objectWithLanguages, lang, defaultLang) {
  var obj = {};
  defaultLang = defaultLang || lang;
  // Detect keys that need translating
  _.each(objectWithLanguages, function(value, key) {
    if (!_.isObject(value) || _.isArray(value)) {
      obj[key] = value;
      return;
    }
    var keys = Object.keys(value);
    if (keys.indexOf(lang) !== -1) {
      obj[key] = value[lang];
    } else if (keys.indexOf(defaultLang) !== -1) {
      obj[key] = value[defaultLang];
    } else {
      obj[key] = value;
    }
  });
  return obj;
}

module.exports = i18n;
