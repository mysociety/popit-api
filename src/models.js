var mongoose = require('mongoose');
var mongooseJsonSchema = require('./mongoose-json-schema');

/**
 * Person
 */
var PersonSchema = new mongoose.Schema({}, {collection: 'persons'});
PersonSchema.plugin(mongooseJsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/person.json#'});

/**
 * Organization
 */
var OrganizationSchema = new mongoose.Schema();
OrganizationSchema.plugin(mongooseJsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/organization.json#'});

/**
 * Post
 */
var PostSchema = new mongoose.Schema();
PostSchema.plugin(mongooseJsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/post.json#'});

/**
 * Membership
 */
var MembershipSchema = new mongoose.Schema();
MembershipSchema.plugin(mongooseJsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/membership.json#'});

/**
 * exports
 */
module.exports = {
  Person: mongoose.model('Person', PersonSchema),
  Organization: mongoose.model('Organization', OrganizationSchema),
  Post: mongoose.model('Post', PostSchema),
  Membership: mongoose.model('Membership', MembershipSchema)
};
