"use strict";
/*

  The various collections that the API will serve. This is intended to be
  configuration that the rest of the code uses to work out how to deal with
  API requests.
  
  Ideally there should be no special casing in the code.

*/
var mongoose = require('mongoose');
var jsonSchema = require('./mongoose-json-schema');

function toJSON() {
  /* jshint validthis: true */
  var doc = this.toObject();
  doc.id = doc._id;
  delete doc._id;
  return doc;
}

var PersonSchema = new mongoose.Schema({}, {_id: false, collection: 'persons'});
PersonSchema.methods.toJSON = toJSON;
PersonSchema.plugin(jsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/person.json#'});
mongoose.model('Person', PersonSchema);

var OrganizationSchema = new mongoose.Schema({}, {_id: false});
OrganizationSchema.methods.toJSON = toJSON;
OrganizationSchema.plugin(jsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/organization.json#'});
mongoose.model('Organization', OrganizationSchema);

var PostSchema = new mongoose.Schema({}, {_id: false});
PostSchema.methods.toJSON = toJSON;
PostSchema.plugin(jsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/post.json#'});
mongoose.model('Post', PostSchema);

var MembershipSchema = new mongoose.Schema({}, {_id: false});
MembershipSchema.methods.toJSON = toJSON;
MembershipSchema.plugin(jsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/membership.json#'});
mongoose.model('Membership', MembershipSchema);

module.exports = {
  persons: 'Person',
  organizations: 'Organization',
  posts: 'Post',
  memberships: 'Membership'
};
