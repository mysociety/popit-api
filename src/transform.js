"use strict";

function addLinks(doc, options) {
  if (doc.constructor.collection) {
    if (options.apiBaseUrl) {
      doc.set('url', [
        options.apiBaseUrl,
        doc.constructor.collection.name.toLowerCase(),
        doc._id || doc.id
      ].join('/'));
    }
    if (options.baseUrl && (doc._id || doc.id)) {
      doc.set('html_url', [
        options.baseUrl,
        doc.constructor.collection.name.toLowerCase(),
        doc._id || doc.id
      ].join('/'));
    }
  }
  return doc;
}

function transform(doc, options) {
  doc = addLinks(doc, options);
  return doc;
}

module.exports = transform;
