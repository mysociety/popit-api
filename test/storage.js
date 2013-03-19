"use strict";

var Storage = require("../src/storage"),
    assert  = require('assert');

var storage = new Storage();

describe("Storage", function () {

  beforeEach(function (done) {
    done();
  });
  
  describe("empty", function () {
    it("should be true", function () {
      assert(storage);
    });
  });
  
});
