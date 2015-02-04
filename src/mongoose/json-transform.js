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
  ret = filterDates(doc, ret, options);
  return ret;
}

function filterDates(doc, ret, options) {
  if (!options.at) {
    return ret;
  }

  function checkDates(field) {
    if (!field.start_date && !field.end_date) {
      return true;
    }
    var start = new Date(field.start_date);
    var end = new Date(field.end_date);
    var at = options.at;

    return start < at && (!field.end_date || end > at);
  }

  if (doc.other_names) {
    ret.other_names = doc.other_names.filter(checkDates);
  }

  if (doc.memberships) {
    ret.memberships = doc.memberships.filter(checkDates);
  }

  return ret;
}

function translateDoc(doc, ret, options) {
  if (options.returnAllTranslations) {
    return ret;
  }
  return i18n(ret, options.langs, options.defaultLanguage, options.includeTranslations);
}
