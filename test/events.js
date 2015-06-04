"use strict";

var assert = require('assert');
var supertest = require('supertest');
var app = require('../');
var defaults = require('./defaults');
var mongoose = require('mongoose');
var fixture = require("./fixture");

require('../src/models');

var request = supertest(app({databaseName: defaults.databaseName}));

describe("Events API", function() {

  beforeEach(fixture.clearDatabase);

  before(function() {
    mongoose.connect('mongodb://localhost/' + defaults.databaseName);
  });

  after(function(done) {
    mongoose.connection.close(done);
  });


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

      describe("individual events", function() {
        beforeEach(function(done) {
          var Event = mongoose.model('Event');
          Event.create({
            _id: "parliament-41",
            name: "41st Parliament",
            start_date: "2011-06-02",
            location: "House of Commons",
            classification: "parliament"
          }, done);
        });

        it("allows retrieving them", function(done) {
          request.get('/' + version + '/events/parliament-41')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.name, "41st Parliament");
            done();
          });
        });

      });

    });

  });

});
