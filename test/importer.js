"use strict";

var assert = require('assert');
var mongoose = require('mongoose');
var fixture = require('./fixture');
var defaults = require('./defaults');

var importer = require('../src/importer');

describe("importing popolo json", function() {
  var connection;

  before(function() {
    connection = mongoose.createConnection('mongodb://localhost/' + defaults.databaseName);
  });

  after(function(done) {
    connection.close(done);
  });

  beforeEach(fixture.clearDatabase);

  it("includes all data", function(done) {
    var popoloObject = {
      persons: [
        { name: 'John Smith' },
      ],
    };
    importer(connection, popoloObject, function(err) {
      assert.ifError(err);
      var Person = connection.model('Person');
      Person.count(function(err, count) {
        assert.ifError(err);
        assert.equal(1, count);
        done();
      });
    });
  });

});
