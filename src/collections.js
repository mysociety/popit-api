/*

  The various collections that the API will serve. This is intended to be
  configuration that the rest of the code uses to work out how to deal with
  API requests.
  
  Ideally there should be no special casing in the code.

*/
var mongoose = require('mongoose');
var jsonSchema = require('./mongoose-json-schema');

var PersonSchema = new mongoose.Schema();
PersonSchema.plugin(jsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/person.json#'});

var OrganizationSchema = new mongoose.Schema();
OrganizationSchema.plugin(jsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/organization.json#'});

var PostSchema = new mongoose.Schema();
PostSchema.plugin(jsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/post.json#'});

var MembershipSchema = new mongoose.Schema();
MembershipSchema.plugin(jsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/membership.json#'});

module.exports = {
  persons: mongoose.model('Person', PersonSchema),
  organizations: mongoose.model('Organization', OrganizationSchema),
  posts: mongoose.model('Post', PostSchema),
  memberships: mongoose.model('Membership', MembershipSchema)
};
