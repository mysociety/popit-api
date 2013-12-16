var mongoose = require('mongoose');
var mongooseJsonSchema = require('./mongoose-json-schema');

function toJSON() {
  /* jshint validthis: true */
  var doc = this.toObject();
  doc.id = doc._id;
  delete doc._id;
  return doc;
}

/**
 * Person
 */
var PersonSchema = new mongoose.Schema({}, {collection: 'persons', _id: false});
PersonSchema.plugin(mongooseJsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/person.json#'});
PersonSchema.methods.toJSON = toJSON;

/**
 * Organization
 */
var OrganizationSchema = new mongoose.Schema({}, {_id: false});
OrganizationSchema.plugin(mongooseJsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/organization.json#'});
OrganizationSchema.methods.toJSON = toJSON;

/**
 * Post
 */
var PostSchema = new mongoose.Schema({}, {_id: false});
PostSchema.plugin(mongooseJsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/post.json#'});
PostSchema.methods.toJSON = toJSON;

/**
 * Membership
 */
var MembershipSchema = new mongoose.Schema({}, {_id: false});
MembershipSchema.plugin(mongooseJsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/membership.json#'});
MembershipSchema.methods.toJSON = toJSON;

/**
 * Models
 */
mongoose.model('Person', PersonSchema);
mongoose.model('Organization', OrganizationSchema);
mongoose.model('Post', PostSchema);
mongoose.model('Membership', MembershipSchema);
