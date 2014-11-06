"use strict";

var mongoose = require('mongoose');
var popolo = require('./mongoose/popolo');
var membershipFinder = require('./mongoose/membership-finder');
var async = require('async');
var _ = require('underscore');
var esFilterDatesOnly = require('./esfilter')().esFilterDatesOnly;
var merge = require('./mongoose/merge');

mongoose.set('debug', !!process.env.MONGOOSE_DEBUG);

/**
 * Person
 */
var PersonSchema = new mongoose.Schema({_id: String}, {collection: 'persons', strict: false});
PersonSchema.plugin(popolo, {popoloSchemaUrl: 'http://popoloproject.com/schemas/person.json#'});
PersonSchema.plugin(membershipFinder, {field: 'person_id'});
PersonSchema.plugin(merge);
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

  function applyToJSON(err, doc, done) {
    if ( err ) {
      done(err);
    }

    if (!doc) {
      return done();
    }

    if (doc.toJSON) {
      doc = doc.toJSON( { transform: esFilterDatesOnly });
    }

    done(null, doc);
  }

  originalToElasticsearch.call(this, function(err, doc) {
    if (err) {
      return callback(err);
    }
    async.parallel({
      person: function(done) {
        Person.findById(self.person_id, {memberships: 0}, function(err, doc) { applyToJSON(err, doc, done); });
      },
      organization: function(done) {
        Organization.findById(self.organization_id, {memberships: 0}, function(err, doc) { applyToJSON(err, doc, done); });
      },
      post: function(done) {
        Post.findById(self.post_id, {memberships: 0}, function(err, doc) { applyToJSON(err, doc, done); });
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

      callback(null, doc);
    });
  });
};

// This method doesn't do anything, it just provides the same interface as
// the other models get from the membershipFinder plugin.
MembershipSchema.methods.populateMemberships = function populateMemberships(callback) {
  callback();
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
