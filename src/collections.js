require('./models');
/*

  The various collections that the API will serve. This is intended to be
  configuration that the rest of the code uses to work out how to deal with
  API requests.
  
  Ideally there should be no special casing in the code.

*/

module.exports = {
  persons: {
    model: 'Person',
    popoloSchemaUrl: 'http://popoloproject.com/schemas/person.json#',
  },
  organizations: {
    model: 'Organization',
    popoloSchemaUrl: 'http://popoloproject.com/schemas/organization.json#',
  },
  posts: {
    model: 'Post',
    popoloSchemaUrl: 'http://popoloproject.com/schemas/post.json#',
  },
  memberships: {
    model: 'Membership',
    popoloSchemaUrl: 'http://popoloproject.com/schemas/membership.json#',
  },
};
