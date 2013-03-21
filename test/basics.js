"use strict";

var request   = require("supertest"),
    assert    = require('assert'),
    apiApp    = require("../"),
    serverApp = require("../test-server-app");

request = request(serverApp);

describe("Apps", function () {
  
  describe("Test server app", function () {
    describe("non-api app pages", function () {

      it("should 404 on index", function (done) {
        request
          .get("/")
          .expect(404)
          .end(done);
      });

      it("should 404 on not '/api' paths", function (done) {
        request
          .get("/foo/bar/baz")
          .expect(404)
          .end(done);
      });

    });

  });

  describe("API app", function () {
  
    describe('config', function () {
  
      it("should throw if not given correct config", function () {
        assert.throws(
          function () {
            apiApp({});
          },
          "Missing required option 'databaseName'"
        );
      });
      
      it("correct config", function () {
        assert(
          apiApp({ databaseName: 'some-test-database' })
        );
      });
      
    });
  
    describe('paths', function () {
      it("should 200 on '/api'", function (done) {
        request
          .get("/api")
          .expect(200)
          .end(done);
      });
      
      it("should 404 on '/api/bad/path'", function (done) {
        request
          .get("/api/bad/path")
          .expect(404)
          .end(done);
      });
    });
  });
});

