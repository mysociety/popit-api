"use strict";

exports.fields = {all: {}};

function filterDoc(doc) {
  if (!doc) {
    return;
  }
  if (doc._id) {
    doc.id = doc._id;
    delete doc._id;
  }

  var fields = exports.fields;

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
}

/**
 * Filter passed docs using the fields argument.
 *
 * @param {Array} docs The docs to filter
 * @param {Object} fields The field spec to use when filtering
 * @return {Array} The array of docs after processing
 */
function filterDocs(docs) {
  docs.forEach(filterDoc);
  return docs;
}

exports.doc = filterDoc;
exports.docs = filterDocs;
