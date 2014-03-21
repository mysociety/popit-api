"use strict";

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
  schema.pre('init', function(next, data) {
    var Membership = this.model('Membership');
    var modelName = this.constructor.modelName;
    var queries = [];
    var query = {};
    query[options.field] = data._id;
    queries.push(query);
    queries.push({'member.@type': modelName, 'member.id': data._id});
    Membership.find({$or: queries}, function(err, docs) {
      if (err) {
        return next(err);
      }
      data.memberships = docs;
      next();
    });
  });
}

module.exports = membershipFinder;
