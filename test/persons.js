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

  describe("post to collection", function () {

    it("should create entry and redirect when valid", function (done) {
      // FIXME - data is not currently being saved. Need to check tha it will be.
      request
        .post("/api/persons")
        .send({ name: "Joe Bloggs" })
        .expect(201)
        .expect('')
        .expect('Location', /^\/api\/persons\/[0-9a-f]{24}$/)
        .end(done);
    });

    it("should error when not valid", function (done) {
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

    it("should error when not valid", function (done) {
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
