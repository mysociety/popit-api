"use strict";

var request       = require("supertest"),
    async         = require('async'),
    assert        = require('assert'),
    fixture       = require("./fixture"),
    defaults      = require("./defaults"),
    packageJSON   = require("../package"),
    serverApp     = require("../test-server-app"),
    person        = require('./util').person,
    mongoose      = require('mongoose'),
    dropElasticsearchIndex = require('./util').dropElasticsearchIndex,
    refreshElasticsearchIndex = require('./util').refreshElasticsearchIndex;

require('../src/models');

request = request(serverApp);

describe("REST", function () {

  beforeEach(fixture.clearDatabase);

  describe("malformed requests", function () {
    describe("Content-Type of 'json' but no body", function () {
      it("should not 400", function (done) {
        request
          .del("/api/persons/123")
          .type('json') // to force the application/json content type header
          .send("")     // don't send anything
          .expect(204)
          .end(done);
      });
    });
  });

  describe("/api ", function () {
    it("should 200 with API info", function (done) {
      request
        .get("/api")
        .expect(200)
        .expect({
          info: {
            databaseName: defaults.databaseName,
            version:      packageJSON.version,
          },
        })
        .end(done);
      
    });
  });

  describe("/api/collectionName", function () {

    describe("GET", function () {

      it("should return empty list", function (done) {
        async.each( [ 'persons', 'memberships', 'organizations', 'posts' ], function(type, callback) {
            request
              .get("/api/" + type)
              .expect(200)
              .expect({result: []})
              .end(callback);
          }, done);
      });

      describe("should return created", function () {
        beforeEach(fixture.loadFixtures);

        it('persons', function(done) {
          request
            .get("/api/persons")
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }
              assert.equal('fred-bloggs', res.body.result[0].id);
              assert.equal('Fred Bloggs', res.body.result[0].name);
              assert.equal('joe-bloggs', res.body.result[1].id);
              assert.equal('Joe Bloggs', res.body.result[1].name);
              done();
            });
        });

        it('organizations', function(done) {
          request
            .get("/api/organizations")
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }
              assert.equal('parliament', res.body.result[0].id);
              assert.equal('Houses of Parliament', res.body.result[0].name);
              assert.equal('commons', res.body.result[1].id);
              assert.equal('House of Commons', res.body.result[1].name);
              done();
            });
        });

        it('memberships', function(done) {
          request
            .get("/api/memberships")
            .expect(200)
            .expect({
              result: [
                { id: 'oldMP', post_id: 'avalon', organization_id: 'commons', role: 'Member of Parliament',
                  person_id: 'fred-bloggs', start_date: '2000', end_date: '2004', links: [], contact_details: [] },
                { id: 'backAsMP', post_id: 'avalon', organization_id: 'commons', role: 'Member of Parliament',
                    person_id: 'fred-bloggs', start_date: '2011', links: [], contact_details: [] },
              ],
            })
            .end(done);
        });

        it('posts', function(done) {
          request
            .get("/api/posts")
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              assert.equal(2, res.body.result.length);
              assert.equal(2, res.body.result[1].memberships.length);

              done();
            });
        });
      });

    });

    describe("POST", function () {

      it("should create entry and return Location when valid", function (done) {
        async.waterfall([
          function(callback){
            request
              .post("/api/persons")
              .send({ name: "Joe Bloggs" })
              .expect(200)
              .end(function (err, res) {
                assert(res.body.result.id);
                assert(res.body.result.name);
                callback(err, res.body.result.id);
              });
          },
          function(id, callback){
            request
              .get("/api/persons/" + id)
              .expect(200)
              .end(function (err, res) {
                assert(res.body.result.id);
                assert(res.body.result.name);
                callback(err);
              });
          },
        ], done);
      });

      it("should create entry using provided id", function (done) {
        async.series([
          function(callback){

            var personDoc = person({ id: 'test', name: "Joe Bloggs" });
            request
              .post("/api/persons")
              .send(personDoc)
              .expect(200)
              .expect({ result: personDoc })
              .end(callback);
          },
          function(callback){
            request
              .get('/api/persons/test')
              .expect(200)
              .expect({ result: person({ id: 'test', name: "Joe Bloggs" }) })
              .end(callback);
          },
        ], done);
      });

      it("should error when not valid (bad name)", function (done) {
        request
          .post("/api/persons")
          .send({ name: 123, meme: "Harlem Shake" }) // name should be string
          .expect(400)
          .expect("Content-Type", "application/json; charset=utf-8")
          .expect({
            errors: [ "Error 'Instance is not a required type' with 'http://popoloproject.com/schemas/person.json#/properties/name'." ]
          })
          .end(done);
      });

      it("should error when not valid (missing name)", function (done) {
        request
          .post("/api/persons")
          .send({ meme: "Harlem Shake" }) // no name
          .expect(400)
          .expect("Content-Type", "application/json; charset=utf-8")
          .expect({
            errors: [ "Error 'Property is required' with 'http://popoloproject.com/schemas/person.json#/properties/name'." ]
          })
          .end(done);
      });

      it("should accept arbitrary fields and save them", function(done) {
        request
          .post("/api/persons")
          .send({id: 'test', name: 'Test', meme: 'Harlem Shake', tags: ['music', 'shaking']})
          .expect(200)
          .expect({
            result: person({id: 'test', name: 'Test', meme: 'Harlem Shake', tags: ['music', 'shaking']})
          }, done);
      });

    });

    describe("PUT", function () {
      it("should 405", function (done) {
        request
          .put("/api/persons")
          .send([{id: "test", name: "Foo"}])
          .expect(405)
          .end(done);
      });
    });

    describe("DELETE", function () {
      it("should 405", function (done) {
        request
          .del("/api/persons")
          .expect(405)
          .end(done);
      });
    });

  });

  describe("/api/collectionName/id", function () {

    describe("GET", function () {

      beforeEach(fixture.loadFixtures);

      it("should 200 when doc exists", function (done) {
        request
          .get("/api/persons/fred-bloggs")
          .expect(200, done);
      });

      it("should 404 when doc does not exist", function (done) {
        request
          .get("/api/persons/i-do-not-exist")
          .expect(404)
          .expect({
            errors: [ "id 'i-do-not-exist' not found" ]
          })
          .end(done);
      });

    });

    describe("POST", function () {
      it("should 405", function (done) {
        request
          .post("/api/persons/does-not-exist")
          .send({name: "Foo"})
          .expect(405)
          .end(done);
      });
    });

    describe("PUT", function () {

      it("should create entry and return Location when valid", function (done) {
        async.series([
          function(callback){
            request
              .put("/api/persons/test")
              .send({ name: "Joe Bloggs" })
              .expect(200)
              .expect({ result: person({ id: "test", name: "Joe Bloggs" }) })
              .end(callback);
          },
          function(callback){
            request
              .get("/api/persons/test")
              .expect(200)
              .expect({ result: person({ id: "test", name: "Joe Bloggs" }) })
              .end(callback);
          },
          function(callback){
            request
              .put("/api/persons/test")
              .send({ id: 'test', name: "Fred Smith" })
              .expect(200)
              .expect({ result: person({ id: "test", name: "Fred Smith" }) })
              .end(callback);
          },
          function(callback){
            request
              .get("/api/persons/test")
              .expect(200)
              .expect({ result: person({ id: "test", name: "Fred Smith" }) })
              .end(callback);
          },
        ], done);
      });

      it("should error if url id and doc id differ", function (done) {
        request
          .put("/api/persons/test")
          .send({ id: "different", name: "Joe Bloggs" })
          .expect(400)
          .expect({errors: ["URL id and document id are different"]})
          .end(done);
      });

      it("should error when not valid (bad name)", function (done) {
        request
          .put("/api/persons/test")
          .send({ name: 123, meme: "Harlem Shake" }) // name should be string
          .expect(400)
          .end(done);
      });

    });


    describe("DELETE", function () {

      beforeEach(fixture.loadFixtures);

      it("document that does exist", function (done) {
        async.series([
          function(callback){
            request
              .del("/api/persons/fred-bloggs")
              .expect(204)
              .end(callback);
          },
          function(callback){
            request
              .get('/api/persons/fred-bloggs')
              .expect(404)
              .end(callback);
          },
        ], done);
      });

      it("document that does not exist", function (done) {
        request
          .del("/api/persons/does-not-exist")
          .expect(204)
          .end(done);
      });

    });

  });

  describe("GET /search/:collection", function() {

    before(dropElasticsearchIndex(defaults.databaseName.toLowerCase()));

    before(function(done) {
      mongoose.connect('mongodb://localhost/' + defaults.databaseName);
      mongoose.model('Person').create({
        _id: 'bby',
        id: 'bby',
        name: 'Barnaby',
        email: 'barnaby@example.org'
      }, function(err, doc) {
        if (err) {
          return done(err);
        }
        doc.on('es-indexed', done);
      });
    });

    after(function(done) {
      mongoose.connection.close(done);
    });

    before(refreshElasticsearchIndex(defaults.databaseName.toLowerCase()));

    it("returns names when searching", function(done) {
      request.get('/api/search/persons?q=Barnaby')
      .expect(200)
      .expect({
        total: 1,
        result: [
          person({id: 'bby', name: 'Barnaby', email: 'barnaby@example.org'})
        ]
      }, done);
    });
  });

  describe("deduplicating slugs", function() {
    beforeEach(function(done) {
      request.post('/api/persons')
      .send({id: 'foo', name: 'Test', slug: 'test'})
      .expect(200, done);
    });

    it("appends a number for a duplicate slug", function(done) {
      request.post('/api/persons')
      .send({id: 'bar', name: 'Test', slug: 'test'})
      .expect({result: person({id: 'bar', name: 'Test', slug: 'test-1'})})
      .expect(200, function(err) {
        if (err) {
          return done(err);
        }
        request.post('/api/persons')
        .send({id: 'baz', name: 'Test', slug: 'test'})
        .expect({result: person({id: 'baz', name: 'Test', slug: 'test-2'})})
        .expect(200, done);
      });
    });
  });

});
