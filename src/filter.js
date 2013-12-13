"use strict";

module.exports = Filter;

/**
 * Constructor for Filter class.
 */
function Filter() {
  this.fields = {
    all: {}
  };
}

/**
 * Filter a document which has been retrieved from mongo. This handles
 * swapping the `_id` and `id` fields, processing hidden fields and
 * removing any fields that start with an underscore, which are considered
 * internal.
 */
Filter.prototype.doc = function(doc) {
  if (!doc) {
    return;
  }
  if (doc._id) {
    doc.id = doc._id;
    delete doc._id;
  }

  var fields = this.fields;

  for (var field in doc) {
    // Remove any fields that have been hidden on this doc.
    if (fields[doc.id]) {
      var value = fields[doc.id][field];
      if (value === false) {
        delete doc[field];
      }
    }

    if (fields.all[field] === false) {
      delete doc[field];
    }

    // Remove 'hidden' fields starting with an underscore.
    if (field.substr(0, 1) === '_') {
      delete doc[field];
    }
  }
  return doc;
};

/**
 * Filter passed docs using the fields argument.
 *
 * @param {Array} docs The docs to filter
 * @return {Array} The array of docs after processing
 */
Filter.prototype.docs = function(docs) {
  docs.forEach(this.doc, this);
  return docs;
};
