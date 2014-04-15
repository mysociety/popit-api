"use strict";

var mongoose = require('mongoose');
var popolo = require('./mongoose/popolo');
var membershipFinder = require('./mongoose/membership-finder');
var async = require('async');
var _ = require('underscore');

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

var originalToElasticsearch = MembershipSchema.methods.toElasticsearch;

/**
 * Override Membership's toElasticsearch method so that we can also index
 * related people, organizations and posts.
 */
MembershipSchema.methods.toElasticsearch = function(callback) {
  var Person = this.model('Person');
  var Organization = this.model('Organization');
  var Post = this.model('Post');
  var self = this;
  originalToElasticsearch.call(this, function(err, doc) {
    if (err) {
      return callback(err);
    }
    Person.schema.set('skipMemberships', true);
    Organization.schema.set('skipMemberships', true);
    Post.schema.set('skipMemberships', true);
    async.parallel({
      person: function(done) {
        Person.findById(self.person_id, {memberships: 0}, done);
      },
      organization: function(done) {
        Organization.findById(self.organization_id, {memberships: 0}, done);
      },
      post: function(done) {
        Post.findById(self.post_id, {memberships: 0}, done);
      },
      member: function(done) {
        if (!self.member) {
          return done();
        }
        self.model(self.member['@type']).findById(self.member.id, {memberships: 0}, done);
      }
    }, function(err, results) {
      if (err) {
        return callback(err);
      }
      _.extend(doc, results);

      Person.schema.set('skipMemberships', false);
      Organization.schema.set('skipMemberships', false);
      Post.schema.set('skipMemberships', false);
      callback(null, doc);
    });
  });
};

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
