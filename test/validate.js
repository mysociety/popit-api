/* jshint camelcase: false */
"use strict";

var assert   = require("assert"),
    validate = require("../src/validate");

function errorCount (count, done) {
  return function (err, errors) {
    assert.ifError(err);

    var formatError = function (error) {
      if (error) {
        return error.message + ': ' + error.schemaUri;
      } else {
        return 'expected errors but got none';
      }
    };

    assert.equal(
      errors.length,
      count,
      formatError(errors[0])
    );
    done();
  };
}

describe("Validation", function () {

  describe("person", function () {

    it("good entry", function (done) {
      validate(
        'persons',
        { id: '123', name: 'Joe Bloggs' },
        errorCount(0, done)
      );
    });

    it("name must be string", function (done) {
      validate(
        'persons',
        { id: '123', name: 123 },
        errorCount(1, done)
      );
    });

    it("id must be string", function (done) {
      validate(
        'persons',
        { id: 123, name: '123' },
        errorCount(1, done)
      );
    });

    it("name is required", function (done) {
      validate(
        'persons',
        { id: '123' },
        errorCount(1, done)
      );
    });
    
    it("other_names must be array", function (done) {
      validate(
        'persons',
        { id: '123', name: 'joe', other_names: 'bob' },
        errorCount(1, done)
      );
    });
    
    
    it("other_names may be empty array", function (done) {
      validate(
        'persons',
        { id: '123', name: 'joe', other_names: [] },
        errorCount(0, done)
      );
    });
    
    it("other_names must be array of correctly formed objects", function (done) {
      validate(
        'persons',
        { id: '123', name: 'joe', other_names: [ { name: 'joey' } ] },
        errorCount(0, done)
      );
    });
    
    it("other_names elements must have names", function (done) {
      validate(
        'persons',
        { id: '123', name: 'joe', other_names: [ { foo: 'bar' }] },
        errorCount(1, done)
      );
    });
    
    it("other_names elements must have names which are strings", function (done) {
      validate(
        'persons',
        { id: '123', name: 'joe', other_names: [ { name: 123 } ] },
        errorCount(1, done)
      );
    });
    
    

  });


  describe("other names", function () {

    it("correctly formed objects", function (done) {
      validate(
        'http://popoloproject.com/schemas/other_name.json#',
        { name: 'joey' },
        errorCount(0, done)
      );
    });

    it("must have names", function (done) {
      validate(
        'http://popoloproject.com/schemas/other_name.json#',
        { foo: 'bar' },
        errorCount(1, done)
      );
    });
    
    it("must have names which are strings", function (done) {
      validate(
        'http://popoloproject.com/schemas/other_name.json#',
        { name: 123 },
        errorCount(1, done)
      );
    });
    
    

  });

  describe("membership", function () {

    it("validates correct entries", function (done) {
      validate(
        'memberships',
        { id: '123', post_id: "mp-birmingham", organization_id: "parliament",
          role: "Member of Parliament", person_id: "fred-bloggs",
          start_date: "2000", end_date: "2006"
        },
        errorCount(0, done)
      );
    });

  });

  describe("post", function () {

    it("validates correct entries", function (done) {
      validate(
        'posts',
        { id: '123', organization_id: "parliament", label: "MP for Birmingham", role: "Member of Parliament" },
        errorCount(0, done)
      );
    });

  });
});
