"use strict";

var assert = require('assert');
var mongoose = require('mongoose');
var fixture = require('./fixture');
var defaults = require('./defaults');

var importer = require('../src/importer');

describe("importing popolo json", function() {

  before(function() {
    mongoose.connect('mongodb://localhost/' + defaults.databaseName);
  });

  after(function(done) {
    mongoose.connection.close(done);
  });

  beforeEach(fixture.clearDatabase);

  it("includes all data", function(done) {
    var popoloObject = {
      persons: [
        { _id: 'john-smith', name: 'John Smith' },
      ],
    };
    importer(mongoose, popoloObject, function(err) {
      assert.ifError(err);
      var Person = mongoose.model('Person');
      Person.count(function(err, count) {
        assert.ifError(err);
        assert.equal(1, count);
        done();
      });
    });
  });

});
