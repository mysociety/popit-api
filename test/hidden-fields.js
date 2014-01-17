"use strict";

var assert = require('assert');
var fixture = require('./fixture');
var defaults = require('./defaults');
var serverApp = require('../test-server-app');
var request = require('supertest')(serverApp);
var person = require('./util').person;
var mongoose = require('mongoose');

var connection;

before(function() {
  connection = mongoose.createConnection('mongodb://localhost/' + defaults.databaseName);
});

after(function(done) {
  connection.close(done);
});

function showsAllFieldsForAuthenticatedRequests() {
  var apiKey = 'secret';
  var apiApp = require('..')({databaseName: defaults.databaseName, apiKey: apiKey});
  var api = require('supertest')(apiApp);

  describe("authenticated requests", function() {

    it("includes the hidden fields on /:collection/:id", function(done) {
      api
      .get('/persons/joe-bloggs?apiKey=' + apiKey)
      .expect(200)
      .expect({
        result: person({
          id: 'joe-bloggs',
          name: 'Joe Bloggs',
          email: 'jbloggs@example.org'
        })
      }, done);
    });

    it("includes the hidden fields on /:collection", function(done) {
      api
      .get('/persons?apiKey=' + apiKey)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }

        res.body.result.forEach(function(result) {
          assert(result.email);
        });
        done();
      });
    });

  });
}

describe("hidden fields", function () {

  beforeEach(fixture.clearDatabase);
  beforeEach(fixture.loadFixtures);

  describe("globally hidden fields", function() {
    var apiApp = require('..')({
      databaseName: defaults.databaseName,
      apiKey: 'secret',
      fieldSpec: [{
        collectionName: 'persons',
        fields: {
          email: false
        }
      }]
    });
    var api = require('supertest')(apiApp);

    it("hides fields in all documents", function(done) {
      api
      .get('/persons')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        res.body.result.forEach(function(result) {
          assert(!result.email);
        });
        done();
      });
    });

    it("hides fields on individual documents", function(done) {
      api
      .get('/persons/fred-bloggs')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        assert(!res.body.result.email);
        done();
      });
    });

    describe("when apiKey is provided", function() {

      it("shows all fields in all documents", function(done) {
        api
        .get('/persons?apiKey=secret')
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          res.body.result.forEach(function(result) {
            assert(result.email);
          });
          done();
        });
      });

      it("shows all fields on individual documents", function(done) {
        api
        .get('/persons/fred-bloggs?apiKey=secret')
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          assert(res.body.result.email);
          done();
        });
      });

    });

  });

  describe("collection wide", function () {

    beforeEach(function(done) {
      var hiddenDoc = {
        collectionName: 'persons',
        fields: {
          email: false
        }
      };

      connection.model('Hidden').create(hiddenDoc, done);
    });

    showsAllFieldsForAuthenticatedRequests();

    describe("public requests", function() {

      it("doesn't return the hidden field on /:collection/:id", function (done) {
        request
        .get("/api/persons/joe-bloggs")
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          assert(!res.body.result.email);
          done();
        });
      });

      it("doesn't return the hidden field on /:collection", function(done) {
        request
        .get('/api/persons')
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          res.body.result.forEach(function(result) {
            assert(!result.email);
          });
          done();
        });
      });

    });

  });

  describe("on a per-document basis", function() {

    beforeEach(function(done) {
      var hiddenDoc = {
        collectionName: 'persons',
        doc: 'joe-bloggs',
        fields: {
          email: false
        }
      };

      connection.model('Hidden').create(hiddenDoc, done);
    });

    showsAllFieldsForAuthenticatedRequests();

    describe("public requests", function() {

      it("doesn't include the hidden field for the individual document", function(done) {
        request
        .get("/api/persons/joe-bloggs")
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          assert(!res.body.result.email);
          done();
        });
      });

      it("includes the hidden field for other documents", function(done) {
        request
        .get("/api/persons/fred-bloggs")
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          assert(res.body.result.email);
          done();
        });
      });

      it("doesn't include fields on hidden documents for /:collection", function(done) {
        request
        .get('/api/persons')
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          assert(res.body.result[0].email);
          assert(!res.body.result[1].email);
          done();
        });
      });

    });

  });

});
