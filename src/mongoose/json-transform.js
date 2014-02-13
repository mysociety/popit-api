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
  ret = filter(doc, ret, options);
  ret = addLinks(doc, ret, options);
  return ret;
}

function addLinks(doc, ret, options) {
  if (doc.constructor.collection) {
    if (options.apiBaseUrl) {
      ret.url = [
        options.apiBaseUrl,
        doc.constructor.collection.name.toLowerCase(),
        doc._id || doc.id
      ].join('/');
    }
    if (options.baseUrl && doc.slug) {
      ret.html_url = [
        options.baseUrl,
        doc.constructor.collection.name.toLowerCase(),
        doc.slug
      ].join('/');
    }
  }
  return ret;
}
