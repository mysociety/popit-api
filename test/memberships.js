"use strict";

var assert = require('assert');
var mongoose = require('mongoose');
var defaults = require('./defaults');
var fixtures = require("pow-mongodb-fixtures");
require('../src/models');

describe("memberships", function() {
  var fixture = fixtures.connect(defaults.databaseName);
  var Person = mongoose.model('Person');
  var Organization = mongoose.model('Organization');
  var Membership = mongoose.model('Membership');

  before(function() {
    mongoose.connect('mongodb://localhost/' + defaults.databaseName);
  });

  after(function(done) {
    mongoose.connection.close(done);
  });

  beforeEach(function(done) {
    fixture.clearAllAndLoad({
      persons: [
        {_id: 'joe-bloggs', name: 'Joe Bloggs'},
        {_id: 'jane-bloggs', name: 'Jane Bloggs'}
      ],
      organizations: [
        {_id: 'foo-widgets', name: 'Foo Widgets'},
        {_id: 'bar-widgets', name: 'Bar Widgets'}
      ],
      memberships: [
        {_id: 'membership-1', organization_id: 'foo-widgets', member: {'@type': 'Person', 'id': 'joe-bloggs'}},
        {_id: 'membership-2', organization_id: 'foo-widgets', member: {'@type': 'Organization', 'id': 'bar-widgets'}},
        {_id: 'membership-3', organization_id: 'bar-widgets', member: {'@type': 'Person', 'id': 'jane-bloggs'}}
      ]
    }, done);
  });

  describe("organizations", function() {
    it("populated memberships", function(done) {
      Organization.findById('foo-widgets', function(err, org) {
        assert.ifError(err);
        assert.equal(org.memberships.length, 2);
        assert.deepEqual(org.memberships[0].member, {'@type': 'Person', id: 'joe-bloggs'});
        assert.deepEqual(org.memberships[1].member, {'@type': 'Organization', id: 'bar-widgets'});
        done();
      });
    });
  });

  describe("persons", function() {

    it("populates memberships", function(done) {
      Person.findById('jane-bloggs', function(err, person) {
        assert.ifError(err);
        assert.equal(person.memberships.length, 1);
        assert.equal(person.memberships[0].organization_id, 'bar-widgets');
        done();
      });
    });
  });

  describe("indexing in elasticsearch", function() {
    it("populates related models", function(done) {
      Membership.findById('membership-1', function(err, membership) {
        assert.ifError(err);
        membership.toElasticsearch(function(err, result) {
          assert.ifError(err);
          assert.equal(result.organization._id, 'foo-widgets');
          assert.equal(result.organization.name, 'Foo Widgets');
          done();
        });
      });
    });
  });
});
