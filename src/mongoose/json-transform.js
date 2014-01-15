"use strict";

var filter = require('../filter');

module.exports = jsonTransformPlugin;

function jsonTransformPlugin(schema) {
  schema.set('toJSON', {transform: filterFields});
}

/**
 * Transform a document to a json doc.
 *
 * - options.fieldSpec The fields to show/hide
 */
function filterFields(doc, ret, options) {
  return filter(ret, options.fields);
}
