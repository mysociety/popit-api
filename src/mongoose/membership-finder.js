"use strict";

function membershipFinder(schema, options) {
  schema.pre('init', function(next, data) {
    var queries = [];
    var query = {};
    query[options.field] = data._id;
    queries.push(query);
    queries.push({'member.@type': this.constructor.modelName, 'member.id': data._id});
    this.model('Membership').find({$or: queries}, function(err, docs) {
      if (err) {
        return next(err);
      }
      data.memberships = docs;
      next();
    });
  });
}

module.exports = membershipFinder;
