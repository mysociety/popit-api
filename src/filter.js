"use strict";

module.exports = filter;

/**
 * Filter a document which has been retrieved from mongo. This handles
 * swapping the `_id` and `id` fields, processing hidden fields and
 * removing any fields that start with an underscore, which are considered
 * internal.
 */
function filter(doc, ret, options) {
  if (!doc) {
    return;
  }

  var fields = options.fields || {};

  var newDoc = {};

  if (doc._id) {
    newDoc.id = doc._id;
  }

  for (var field in ret) {
    // Skip any fields that have been hidden on this doc.
    if (fields[ret._id]) {
      var value = fields[ret._id][field];
      if (value === false) {
        continue;
      }
    }

    // Skip any fields that have been hidden for all docs.
    if (fields.all && fields.all[field] === false) {
      continue;
    }

    // Skip 'hidden' fields starting with an underscore.
    if (field.substr(0, 1) === '_') {
      continue;
    }

    if (field === 'memberships' && doc.schema.get('skipMemberships')) {
      continue;
    }

    // If we've made it this far then copy the field to the new doc.
    newDoc[field] = ret[field];
  }
  return newDoc;
}
