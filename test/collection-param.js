"use strict";

var request   = require("supertest"),
    serverApp = require("../server-app");

request = request(serverApp);

describe("collection param", function () {

  describe("bad collection", function () {

    it("should 404 on not found", function (done) {
      request
        .get("/api/bad")
        .expect(404)
        .expect({error: "collection 'bad' not found" })
        .end(done);
    });

  });

  describe("good collection", function () {

    it("should 200 when valid", function (done) {
      request
        .get("/api/persons")
        .expect(200)
        .end(done);
    });

  });

});
