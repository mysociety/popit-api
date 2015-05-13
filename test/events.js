"use strict";

var assert = require('assert');
var supertest = require('supertest');
var app = require('../');
var defaults = require('./defaults');

var request = supertest(app({databaseName: defaults.databaseName}));

describe("Events API", function() {

  ['v0.1', 'v1.0.0-alpha'].forEach(function(version) {
    describe(version, function() {

      it("allows accessing all events", function(done) {
        request.get('/' + version + '/events')
        .expect(200, done);
      });

      it("allows creating events", function(done) {
        request.post('/' + version + '/events')
        .send({name: '56th UK Parliament'})
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.name, "56th UK Parliament");
          done();
        });
      });

    });

  });

});
