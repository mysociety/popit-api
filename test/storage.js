"use strict";

var Storage = require("../src/storage"),
    assert  = require('assert');


var storage = new Storage('test-popit-db');


describe("Storage", function () {

  before(function (done) {
    storage.init(done);
  });

  describe("store and retrieve", function () {

    before(function (done) {
      storage.empty(done);
    });

    var sampleData = { id: 'test', foo: 'bar' };

    it("store some data", function (done) {
      storage.store('samples', sampleData, function (err, doc) {
        assert.ifError(err);
        assert.deepEqual(doc, sampleData);
        done();
      });
    });

    it("retrieve it", function (done) {
      storage.retrieve('samples', sampleData.id, function (err, doc) {
        assert.ifError(err);
        assert(doc);
        assert.deepEqual( doc, sampleData );
        done();
      });
    });
    
  });
  
  describe("empty", function () {
    it("should be true", function () {
      assert(storage);
    });
  });
  
});
