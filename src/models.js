"use strict";

var mongoose = require('mongoose');
var popolo = require('./mongoose/popolo');
var membershipFinder = require('./mongoose/membership-finder');

mongoose.set('debug', !!process.env.MONGOOSE_DEBUG);

/**
 * Person
 */
var PersonSchema = new mongoose.Schema({_id: String}, {collection: 'persons', strict: false});
PersonSchema.plugin(popolo, {popoloSchemaUrl: 'http://popoloproject.com/schemas/person.json#'});
PersonSchema.plugin(membershipFinder, {field: 'person_id'});
var Person = mongoose.model('Person', PersonSchema);

/**
 * Organization
 */
var OrganizationSchema = new mongoose.Schema({_id: String}, {collection: 'organizations', strict: false});
OrganizationSchema.plugin(popolo, {popoloSchemaUrl: 'http://popoloproject.com/schemas/organization.json#'});
OrganizationSchema.plugin(membershipFinder, {field: 'organization_id'});
var Organization = mongoose.model('Organization', OrganizationSchema);

/**
 * Post
 */
var PostSchema = new mongoose.Schema({_id: String}, {collection: 'posts', strict: false});
PostSchema.plugin(popolo, {popoloSchemaUrl: 'http://popoloproject.com/schemas/post.json#'});
PostSchema.plugin(membershipFinder, {field: 'post_id'});
var Post = mongoose.model('Post', PostSchema);

/**
 * Membership
 */
var MembershipSchema = new mongoose.Schema({_id: String}, {collection: 'memberships', strict: false});
MembershipSchema.plugin(popolo, {popoloSchemaUrl: 'http://popoloproject.com/schemas/membership.json#'});
var Membership = mongoose.model('Membership', MembershipSchema);

/**
 * Export an object with collection -> model properties.
 */

module.exports = {
  'persons': Person,
  'organizations': Organization,
  'posts': Post,
  'memberships': Membership
};

/**
 * Hidden fields mongoose schema
 */
var HiddenSchema = new mongoose.Schema({
  collectionName: String,
  doc: String,
  fields: Object
});
mongoose.model('Hidden', HiddenSchema);
