"use strict";

var assert = require('assert');
var mongoose = require('mongoose');
var defaults = require("./defaults");

require('../src/models');
var Person = mongoose.model('Person');

describe("merging two people", function() {
  before(function() {
    mongoose.connect('mongodb://localhost/' + defaults.databaseName);
  });

  after(function(done) {
    mongoose.connection.close(done);
  });

  it("adds conflicting name to other_names", function(done) {
    var person1 = new Person({name: 'Bob'});
    var person2 = new Person({name: 'Bobby'});
    person1.merge(person2, function(err) {
      if (err) {
        return done(err);
      }
      assert.equal(person1.other_names.length, 1);
      assert.equal(person1.other_names[0].name, 'Bobby');
      done();
    });
  });

  it("adds missing properties from other object", function(done) {
    var person1 = new Person({name: 'Bob'});
    var person2 = new Person({name: 'Bobby', email: 'bob@example.org'});
    person1.merge(person2, function(err) {
      if (err) {
        return done(err);
      }
      assert.equal(person1.email, 'bob@example.org');
      done();
    });
  });

  it("raises an error if conflicts can't be resolved", function(done) {
    var person1 = new Person({name: 'Bob', gender: 'm'});
    var person2 = new Person({name: 'Bobby', gender: 'male'});
    person1.merge(person2, function(err) {
      assert(err);
      done();
    });
  });

});
