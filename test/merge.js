"use strict";

var assert = require('assert');
var mongoose = require('mongoose');
var defaults = require("./defaults");
var fixture = require('./fixture');

require('../src/models');

describe("merging two people", function() {
  var connection;
  var Person;

  before(function() {
    connection = mongoose.createConnection('mongodb://localhost/' + defaults.databaseName);
    Person = connection.model('Person');
  });

  after(function(done) {
    connection.close(done);
  });

  beforeEach(fixture.clearDatabase);

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

  it("merges arrays which are different", function(done) {
    var person1 = new Person({name: 'Bob', contact_details: [{type: 'voice', value: '12345'}]});
    var person2 = new Person({name: 'Bobby', contact_details: [{type: 'cell', value: '0712345'}]});
    person1.merge(person2, function(err) {
      assert.ifError(err);
      assert.equal(person1.contact_details.length, 2);
      assert.equal(person1.contact_details[0].type, 'voice');
      assert.equal(person1.contact_details[0].value, '12345');
      assert.equal(person1.contact_details[1].type, 'cell');
      assert.equal(person1.contact_details[1].value, '0712345');
      done();
    });
  });

  it("doesn't merge arrays which are identical", function(done) {
    var person1 = new Person({name: 'Bob', contact_details: [{type: 'voice', value: '12345'}]});
    var person2 = new Person({name: 'Bobby', contact_details: [{type: 'voice', value: '12345'}]});
    person1.merge(person2, function(err) {
      assert.ifError(err);
      assert.equal(person1.contact_details.length, 1);
      done();
    });
  });

  it("ignores the _id field", function(done) {
    var person1 = new Person({_id: 'bob', name: 'Bob'});
    var person2 = new Person({_id: 'bobby', name: 'Bobby'});
    person1.save(function(err) {
      assert.ifError(err);
      person2.save(function(err) {
        assert.ifError(err);
        person1.merge(person2, function(err) {
          assert.ifError(err);
          done();
        });
      });
    });
  });

  it("ignores the id field", function(done) {
    var person1 = new Person({id: 'bob', name: 'Bob'});
    var person2 = new Person({id: 'bobby', name: 'Bobby'});
    person1.merge(person2, function(err) {
      assert.ifError(err);
      done();
    });
  });

  it("merges fields that aren't in the schema", function(done) {
    var person1 = new Person({name: 'Bob'});
    var person2 = new Person({name: 'Bob', foo: 'bar'});
    person1.merge(person2, function(err) {
      assert.ifError(err);
      assert.equal(person1.get('foo'), 'bar');
      done();
    });
  });

  it("merges arrays of strings", function(done) {
    var person1 = new Person({name: 'Bob', widgets: ['foo', 'bar']});
    var person2 = new Person({name: 'Bob', widgets: ['bar', 'baz']});
    person1.merge(person2, function(err) {
      assert.ifError(err);
      assert.deepEqual(person1.get('widgets'), ['foo', 'bar', 'baz']);
      done();
    });
  });

});
