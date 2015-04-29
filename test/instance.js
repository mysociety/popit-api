"use strict";

var assert = require('assert');
var master = require('../src/master');
var Instance = master.model('Instance');

describe("Instance model", function() {
  beforeEach(function(done) {
    Instance.remove(done);
  });

  describe("slug", function() {
    var instance;

    beforeEach(function() {
      instance = new Instance({slug: 'test-instance', email: 'bob@example.org'});
    });

    it("is required", function(done) {
      instance.slug = null;
      instance.save(function(err) {
        assert.equal(err.errors.slug.message, 'Path `slug` is required.');
        done();
      });
    });

    it("has a minimum length of four", function(done) {
      instance.slug = 'foo';
      instance.save(function(err) {
        assert(err.errors.slug.message.match(/Instance slug must be between 4 and \d+ characters long/));
        done();
      });
    });

    it("gets converted to lowercase", function(done) {
      instance.slug = 'LOUDSLUG';
      instance.save(function(err) {
        assert.ifError(err);
        assert.equal(instance.slug, 'loudslug');
        done();
      });
    });

    it("gets trimmed", function(done) {
      instance.slug = ' whitespace ';
      instance.save(function(err) {
        assert.ifError(err);
        assert.equal(instance.slug, 'whitespace');
        done();
      });
    });

    it("must be unique", function(done) {
      instance.save(function(err) {
        assert.ifError(err);
        var newInstance = new Instance({slug: 'test-instance', email: 'bob@example.com'});
        newInstance.save(function(err) {
          assert.equal(err.errors.slug.message, 'Error, expected `slug` to be unique. Value: `test-instance`');
          done();
        });
      });
    });

  });

});
