"use strict";

var fixture = require('./fixture');
var Storage = require('../src/storage');
var defaults = require('./defaults');
var serverApp = require('../test-server-app');
var request = require('supertest')(serverApp);

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
        result: {
          id: 'joe-bloggs',
          name: 'Joe Bloggs',
          email: 'jbloggs@example.org'
        }
      }, done);
    });

    it("includes the hidden fields on /:collection", function(done) {
      api
      .get('/persons?apiKey=' + apiKey)
      .expect(200)
      .expect({
        result: [
          { id: 'fred-bloggs', name: 'Fred Bloggs', email: 'fbloggs@example.org' },
          { id: 'joe-bloggs', name: 'Joe Bloggs', email: 'jbloggs@example.org' },
        ]
      }, done);
    });

  });
}

describe("hidden fields", function () {

  before(Storage.connectToDatabase);
  beforeEach(fixture.clearDatabase);
  beforeEach(fixture.loadFixtures);

  describe("collection wide", function () {

    beforeEach(function(done) {
      var storage = new Storage(defaults.databaseName);
      var hiddenDoc = {
        id: Storage.generateID(),
        collection: 'persons',
        fields: {
          email: false
        }
      };

      storage.store('hidden', hiddenDoc, done);
    });

    showsAllFieldsForAuthenticatedRequests();

    describe("public requests", function() {

      it("doesn't return the hidden field on /:collection/:id", function (done) {
        request
        .get("/api/persons/joe-bloggs")
        .expect(200)
        .expect({ result: { id: 'joe-bloggs', name: 'Joe Bloggs' } }, done);
      });

      it("doesn't return the hidden field on /:collection", function(done) {
        request
        .get('/api/persons')
        .expect(200)
        .expect({
          result: [
            { id: 'fred-bloggs', name: 'Fred Bloggs'},
            { id: 'joe-bloggs', name: 'Joe Bloggs'}
          ]
        }, done);
      });

    });

  });

  describe("on a per-document basis", function() {

    beforeEach(function(done) {
      var storage = new Storage(defaults.databaseName);
      var hiddenDoc = {
        id: Storage.generateID(),
        collection: 'persons',
        doc: 'joe-bloggs',
        fields: {
          email: false
        }
      };

      storage.store('hidden', hiddenDoc, done);
    });

    showsAllFieldsForAuthenticatedRequests();

    describe("public requests", function() {

      it("doesn't include the hidden field for the individual document", function(done) {
        request
        .get("/api/persons/joe-bloggs")
        .expect(200)
        .expect({ result: { id: 'joe-bloggs', name: 'Joe Bloggs' } }, done);
      });

      it("includes the hidden field for other documents", function(done) {
        request
        .get("/api/persons/fred-bloggs")
        .expect(200)
        .expect({ result: { id: 'fred-bloggs', name: 'Fred Bloggs', email: 'fbloggs@example.org' } }, done);
      });

      it("doesn't include fields on hidden documents for /:collection", function(done) {
        request
        .get('/api/persons')
        .expect(200)
        .expect({
          result: [
            { id: 'fred-bloggs', name: 'Fred Bloggs', email: 'fbloggs@example.org'},
            { id: 'joe-bloggs', name: 'Joe Bloggs'}
          ]
        }, done);
      });

    });

  });

});
