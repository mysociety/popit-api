"use strict";

module.exports = filter;

/**
 * Filter a document which has been retrieved from mongo. This handles
 * swapping the `_id` and `id` fields, processing hidden fields and
 * removing any fields that start with an underscore, which are considered
 * internal.
 */
function filter(doc, fields) {
  if (!doc) {
    return;
  }

  var newDoc = {};

  if (doc._id) {
    newDoc.id = doc._id;
  }

  for (var field in doc) {
    // Skip any fields that have been hidden on this doc.
    if (fields[doc._id]) {
      var value = fields[doc._id][field];
      if (value === false) {
        continue;
      }
    }

    // Skip any fields that have been hidden for all docs.
    if (fields.all[field] === false) {
      continue;
    }

    // Skip 'hidden' fields starting with an underscore.
    if (field.substr(0, 1) === '_') {
      continue;
    }

    // If we've made it this far then copy the field to the new doc.
    newDoc[field] = doc[field];
  }
  return newDoc;
}
