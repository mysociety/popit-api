"use strict";

var request   = require("supertest"),
    serverApp = require("../server-app");

request = request(serverApp);

describe("API basics", function () {
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

  describe("API app basics", function () {

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
