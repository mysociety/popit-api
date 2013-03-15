"use strict";

var assert   = require("assert"),
    validate = require("../src/validate");

function errorCount (count, done) {
  return function (err, errors) {
    assert.ifError(err);

    if (errors.length !== count) {
      console.log(errors);
    }

    assert.equal(errors.length, count);
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

  });

});
