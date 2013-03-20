"use strict";

var request   = require("supertest"),
    async     = require('async'),
    serverApp = require("../server-app");

request = request(serverApp);

describe("Persons collection", function () {

  describe("list collection", function () {

    it("should return empty list", function (done) {
      request
        .get("/api/persons")
        .expect(200)
        .expect([])
        .end(done);
    });

  });

  describe("post to collection", function () {

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
            .expect({ id: id, name: "Joe Bloggs" })
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
            .expect({ id: 'test', name: "Joe Bloggs" })
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

});
