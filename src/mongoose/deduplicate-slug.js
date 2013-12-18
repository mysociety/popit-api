"use strict";

// Remove this when slugs are removed from popit, see https://github.com/mysociety/popit/issues/175

module.exports = function(schema) {
  schema.add({slug: String});

  schema.pre('save', function(next) {
    return deduplicateSlug(this, this.collection, next);
  });
};

function deduplicateSlug(doc, collection, cb) {

  if (!doc.slug) {
    return cb(null);
  }

  // find other entries in the database that have the same slug
  collection.findOne({ slug: doc.slug, _id: { $ne: doc.id } }, function(err, conflict) {
    if (err) {
      return cb(err);
    }

    // if nothing found then no need to change slug
    if (!conflict) {
      return cb(null);
    }

    // we have a conflict, increment the slug
    var matches = conflict.slug.match(/^(.*)\-(\d+)$/);

    if ( !matches ) {
      doc.slug = doc.slug + '-1';
    } else {
      var base_slug = matches[1];
      var counter   = parseInt( matches[2], 10 ) + 1;
      doc.slug     = base_slug + '-' + counter;
    }

    return deduplicateSlug(doc, collection, cb); // recurse
  });
}
