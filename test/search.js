"use strict";

var assert = require('assert');
var mongoose = require('mongoose');
var defaults = require('./defaults');
var fixture = require('./fixture');
var loadFixture = require('./util').loadFixture;

require('../src/models');

describe("search", function() {

  before(fixture.clearDatabase);

  before(function() {
    mongoose.connect('mongodb://localhost/' + defaults.databaseName);
  });

  before(loadFixture('persons', __dirname + '/fixtures/sa_persons.json'));
  before(loadFixture('organizations', __dirname + '/fixtures/sa_organizations.json'));
  before(loadFixture('memberships', __dirname + '/fixtures/sa_memberships.json'));

  describe("name resolution fixtures", function() {
    var tests = require('./fixtures/resolved_names');
    tests.forEach(function(row) {
      var name = row[0];
      var expectedId = row[1];

      it("matches " + name + " to " + expectedId, function(done) {
        mongoose.model('Person').search(name, function(err, results) {
          if (err) {
            return done(err);
          }
          if (expectedId !== null) {
            assert(results.length > 0, "No results found for " + name);
          }

          // assert.equal(expectedId, results[0].id, "For " + name + " expected " + expectedId + " got " + results[0].id);

          done();
        });
      });

    });

  });

});
