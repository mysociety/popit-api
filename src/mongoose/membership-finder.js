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

  schema.methods.findMemberships = function findMemberships(id, callback) {
    var Membership = this.model('Membership');
    var modelName = this.constructor.modelName;
    var queries = [];
    var query = {};
    query[options.field] = id;
    queries.push(query);
    queries.push({'member.@type': modelName, 'member.id': id});
    Membership.find({$or: queries}, callback);
  };

  schema.pre('init', function(next, data) {
    if (schema.get('skipMemberships')) {
      return next();
    }
    this.findMemberships(data._id, function(err, docs) {
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
  schema.post('save', function() {
    var Membership = this.model('Membership');
    this.findMemberships(this.id, function(err, docs) {
      if (err) {
        return;
      }
      // TODO: better error handling
      Membership.bulkReIndex(docs, function(err) { if (err) { console.log('bulk reindex error'); console.log(err); } });
    });
  });

  /*
   * After removing, remove any memberships that are related to this doc.
   */
  schema.post('remove', function(doc) {
    this.findMemberships(this.id, function(err, docs) {
      if (err) {
        console.err("Problem removing memberships related to", doc);
        console.err(err);
        return;
      }
      var parent = doc;
      async.each(
        docs,
        function(record, done) {
          record.remove(done);
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
