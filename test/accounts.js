"use strict";

var assert = require('assert');
var supertest = require('supertest');
var app = require('../app');

var request = supertest(app);

describe("Accounts", function() {

  describe("creation", function() {

    /*
    it("returns the created account", function(done) {
      request.post('/accounts')
      .send({ name: 'Bob', email: 'bob@example.org' })
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.name, 'Bob');
        done();
      });
    });
    */

  });

});
