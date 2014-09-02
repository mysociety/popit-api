"use strict";

var async = require("async");

/**
 * Find memberships that are associated with the current object and
 * populate them. This is necessary because memberships are stored in
 * a separate collections to people and organizations, but it makes
 * sense to return them inline.
 *
 * @param {mongoose.Schema} schema The schema to augment with this plugin
 * @param {Object} options
 * @param {String} options.field The field to query against
 */
function membershipFinder(schema, options) {
  function findMemberships(Membership, modelName, id, callback) {
    var queries = [];
    var query = {};
    query[options.field] = id;
    queries.push(query);
    queries.push({'member.@type': modelName, 'member.id': id});
    Membership.find({$or: queries}, callback);
  }

  schema.pre('init', function(next, data) {
    if (schema.get('skipMemberships')) {
      return next();
    }
    findMemberships(this.model('Membership'), this.constructor.modelName, data._id, function(err, docs) {
      if (err) {
        return next(err);
      }
      data.memberships = docs;
      next();
    });
  });

  /**
   * After saving, update any memberships that are related to this doc.
   */
  schema.post('save', function(doc) {
    var that = this;
    findMemberships(this.model('Membership'), this.constructor.modelName, doc._id, function(err, docs) {
      if (err) {
        return;
      }
      // TODO: better error handling
      that.model('Membership').bulkReIndex(docs, function(err) { if (err) { console.log('bulk reindex error'); console.log(err); } });
    });
  });

  /*
   * After removing, remove any memberships that are related to this doc.
   */
  schema.post('remove', function(doc) {
    findMemberships(this.model('Membership'), this.constructor.modelName, doc._id, function(err, docs) {
      if (err) {
        return;
      }
      var parent = doc;
      async.each(
        docs,
        function(doc, done) {
          doc.remove( function(err) { done(err); } );
        },
        function(err) {
          if (!err) {
            parent.emit('memberships-removed');
          }
        }
      );
    });
  });

}

module.exports = membershipFinder;
