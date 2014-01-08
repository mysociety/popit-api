"use strict";

var assert = require('assert');
var mongoose = require('mongoose');
var defaults = require('./defaults');
var fixture = require('./fixture');
var dropElasticsearchIndex = require('./util').dropElasticsearchIndex;
var refreshElasticsearchIndex = require('./util').refreshElasticsearchIndex;
require('../src/models');

describe("Search", function() {
  before(dropElasticsearchIndex(defaults.databaseName.toLowerCase()));

  before(function() {
    mongoose.connect('mongodb://localhost/' + defaults.databaseName);
  });

  beforeEach(fixture.clearDatabase);

  it("indexes documents after saving", function(done) {
    var Person = mongoose.model('Person');
    var person = new Person();
    person._id = person.id = "jsmith";
    person.name = "John Smith";
    person.save(function(err) {
      if (err) {
        return done(err);
      }
      refreshElasticsearchIndex(defaults.databaseName.toLowerCase())(function() {
        Person.search({q: "John Smith"}, function(err, result) {
          if (err) {
            return done(err);
          }
          assert.equal(1, result.hits.hits.length);
          done();
        });
      });
    });
  });
});
