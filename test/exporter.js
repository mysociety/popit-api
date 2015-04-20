"use strict";

var assert = require('assert');
var mongoose = require('mongoose');
var fixture = require('./fixture');
var defaults = require('./defaults');

var exporter = require('../src/exporter');

describe("exporting popolo json", function() {
  before(function() {
    mongoose.connect('mongodb://localhost/' + defaults.databaseName);
  });

  after(function(done) {
    mongoose.connection.close(done);
  });

  beforeEach(fixture.loadFixtures);

  it("includes all data", function(done) {
    exporter(mongoose, {}, function(err, data) {
      assert.ifError(err);
      assert.equal(data.persons.length, 2);
      assert.equal(data.organizations.length, 2);
      assert.equal(data.memberships.length, 2);
      assert.equal(data.posts.length, 2);
      done();
    });
  });

});
