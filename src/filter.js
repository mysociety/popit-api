"use strict";

/**
 * Filter a document which has been retrieved from mongo. This handles
 * swapping the `_id` and `id` fields and * removing any fields that start
 * with an underscore, which are considered internal.
 */
function filter(doc, ret) {
  if (!doc) {
    return;
  }

  var newDoc = {};

  for (var field in ret) {
    // Skip 'hidden' fields starting with an underscore.
    if (field.substr(0, 1) === '_') {
      continue;
    }

    // If we've made it this far then copy the field to the new doc.
    newDoc[field] = ret[field];
  }

  // Set the 'id' last so it doesn't get overwritten by the 'id' of 'ret'
  if (doc._id) {
    newDoc.id = doc._id;
  }

  return newDoc;
}

module.exports = filter;
