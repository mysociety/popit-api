"use strict";

var request   = require("supertest"),
    async     = require('async'),
    // assert    = require('assert'),
    fixture   = require("./fixture"),
    Storage   = require("../src/storage"),
    serverApp = require("../test-server-app");

request = request(serverApp);

describe("REST", function () {

  before(Storage.connectToDatabase);
  beforeEach(fixture.clearDatabase);

  describe("/api/collectionName", function () {

    describe("GET", function () {

      it("should return empty list", function (done) {
        request
          .get("/api/persons")
          .expect(200)
          .expect({result: []})
          .end(done);
      });

      it("should return created entries", function (done) {
        async.series([
          function(callback){
            request
              .post("/api/persons")
              .send({ id: 'joe-bloggs', name: "Joe Bloggs" })
              .end(callback);
          },
          function(callback){
            request
              .post("/api/persons")
              .send({ id: 'fred-smith', name: "Fred Smith" })
              .end(callback);
          },
          function(callback){
            request
              .get("/api/persons")
              .expect(200)
              .expect({
                result: [
                  { id: 'joe-bloggs', name: "Joe Bloggs" },
                  { id: 'fred-smith', name: "Fred Smith" },
                ],
              })
              .end(callback);
          },
        ], done);
      });

    });

    describe("POST", function () {

      it("should create entry and return Location when valid", function (done) {
        async.waterfall([
          function(callback){
            request
              .post("/api/persons")
              .send({ name: "Joe Bloggs" })
              .expect(201)
              .expect('')
              .expect('Location', /^\/api\/persons\/[0-9a-f]{24}$/)
              .end(function (err, res) {
                callback(err, res.headers.location);
              });
          },
          function(location, callback){
            var id = location.match(/\w+$/)[0];
            request
              .get(location)
              .expect(200)
              .expect({ result: { id: id, name: "Joe Bloggs" }})
              .end(callback);
          },
        ], done);
      });

      it("should create entry using provided id", function (done) {
        async.series([
          function(callback){
            request
              .post("/api/persons")
              .send({ id: 'test', name: "Joe Bloggs" })
              .expect(201)
              .expect('')
              .expect('Location', '/api/persons/test')
              .end(callback);
          },
          function(callback){
            request
              .get('/api/persons/test')
              .expect(200)
              .expect({ result: { id: 'test', name: "Joe Bloggs" } })
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
              .expect(201)
              .expect('')
              .expect('Location', '/api/persons/test')
              .end(callback);
          },
          function(callback){
            request
              .get("/api/persons/test")
              .expect(200)
              .expect({ result: { id: "test", name: "Joe Bloggs" } })
              .end(callback);
          },
          function(callback){
            request
              .put("/api/persons/test")
              .send({ id: 'test', name: "Fred Smith" })
              .expect(201)
              .end(callback);
          },
          function(callback){
            request
              .get("/api/persons/test")
              .expect(200)
              .expect({ result: { id: "test", name: "Fred Smith" } })
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
  });


  describe("DELETE", function () {
    it("create, test, delete, test", function (done) {
      async.series([
        function(callback){
          request
            .post("/api/persons")
            .send({ id: 'test', name: "Joe Bloggs" })
            .end(callback);
        },
        function(callback){
          request
            .get('/api/persons/test')
            .expect({ result: { id: 'test', name: "Joe Bloggs" } })
            .end(callback);
        },
        function(callback){
          request
            .del("/api/persons/test")
            .expect(204)
            .end(callback);
        },
        function(callback){
          request
            .get('/api/persons/test')
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
