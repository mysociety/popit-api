"use strict";

var filter = require('../filter');

/**
 * Transform a document to a json doc.
 *
 * - options.fieldSpec The fields to show/hide
 */
function filterFields(doc, ret, options) {
  ret = filter(doc, ret, options);
  return ret;
}

function jsonTransformPlugin(schema) {
  schema.set('toJSON', {transform: filterFields});
}

module.exports = jsonTransformPlugin;
