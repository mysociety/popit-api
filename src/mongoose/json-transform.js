"use strict";

var filter = require('../filter');
var i18n = require('../i18n');

module.exports.jsonTransformPlugin = jsonTransformPlugin;
module.exports.translateDoc = translateDoc;

function jsonTransformPlugin(schema) {
  schema.set('toJSON', {transform: filterFields});
}

/**
 * Transform a document to a json doc.
 *
 * - options.fieldSpec The fields to show/hide
 */
function filterFields(doc, ret, options) {
  ret = filter(doc, ret, options);
  ret = translateDoc(doc, ret, options);
  return ret;
}

function translateDoc(doc, ret, options) {
  if (options.returnAllTranslations) {
    return ret;
  }
  return i18n(ret, options.langs, options.defaultLanguage, options.includeTranslations);
}
