"use strict";

module.exports = Filter;

/**
 * Constructor for Filter class.
 */
function Filter(fields) {
  this.fields = fields || {
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

  var newDoc = {};

  if (doc._id) {
    newDoc.id = doc._id;
  }

  var fields = this.fields;

  for (var field in doc) {
    // Remove any fields that have been hidden on this doc.
    if (fields[doc._id]) {
      var value = fields[doc._id][field];
      if (value === false) {
        continue;
      }
    }

    if (fields.all[field] === false) {
      continue;
    }

    // Remove 'hidden' fields starting with an underscore.
    if (field.substr(0, 1) === '_') {
      continue;
    }

    newDoc[field] = doc[field];
  }
  return newDoc;
};

/**
 * Filter passed docs using the fields argument.
 *
 * @param {Array} docs The docs to filter
 * @return {Array} The array of docs after processing
 */
Filter.prototype.docs = function(docs) {
  return docs.map(this.doc, this);
};
