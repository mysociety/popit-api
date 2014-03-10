"use strict";

function membershipFinder(schema, options) {
  schema.pre('init', function(next, data) {
    var query = {};
    query[options.field] = data._id;
    this.model('Membership').find(query, function(err, docs) {
      if (err) {
        return next(err);
      }
      data.memberships = docs;
      next();
    });
  });
}

/**
 * The various collections that the API will serve. This is intended to be
 * configuration that the rest of the code uses to work out how to deal with
 * API requests.
 *
 * This configuration is used by the models module to create mongoose models
 * from json schemas.
 */

module.exports = {
  persons: {
    model: 'Person',
    popoloSchemaUrl: 'http://popoloproject.com/schemas/person.json#',
    plugins: [
      [membershipFinder, {field: 'person_id'}]
    ],
    startDateField: 'birth_date',
    endDateField: 'death_date',
  },
  organizations: {
    model: 'Organization',
    popoloSchemaUrl: 'http://popoloproject.com/schemas/organization.json#',
    plugins: [
      [membershipFinder, {field: 'organization_id'}]
    ],
    startDateField: 'founding_date',
    endDateField: 'dissolution_date',
  },
  posts: {
    model: 'Post',
    popoloSchemaUrl: 'http://popoloproject.com/schemas/post.json#',
    plugins: [
      [membershipFinder, {field: 'post_id'}]
    ],
    startDateField: 'start_date',
    endDateField: 'end_date',
  },
  memberships: {
    model: 'Membership',
    popoloSchemaUrl: 'http://popoloproject.com/schemas/membership.json#',
    startDateField: 'start_date',
    endDateField: 'end_date',
  },
};
