"use strict";

var request   = require("supertest"),
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

  describe("post to  collection", function () {

    it("should create entry and redirect when valid", function (done) {
      request
        .post("/api/persons")
        .send({ name: "Joe Bloggs" })
        .expect(201)
        .expect('')
        .expect('Location', /^\/api\/persons\/[0-9a-f]{24}$/)
        .end(done);
    });

  });

});
