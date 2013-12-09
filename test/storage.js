"use strict";

var Storage  = require("../src/storage"),
    defaults = require("./defaults"),
    fixture  = require("./fixture"),
    assert   = require('assert');


describe("Storage", function () {

  var storage = null;

  before(function () {
    storage = new Storage(defaults.databaseName);
  });

  describe('helpers', function () {
    it("generateID", function () {
      var id1 = Storage.generateID();
      var id2 = Storage.generateID();
      assert(id1);
      assert((/[a-f0-9]{24}/).test(id1));
      assert.notEqual(id1, id2);
    });
  });
  
  describe("store, retrieve and delete", function () {
  
    before(fixture.clearDatabase);
  
    var sampleData = { id: 'test', foo: 'bar' };
  
    it("check not in collection", function (done) {
      storage.retrieve('persons', sampleData.id, function (err, doc) {
        assert.ifError(err);
        assert(!doc);
        done();
      });
    });
    
    it("list empty collection", function (done) {
      storage.list('persons', function (err, docs) {
        assert.ifError(err);
        assert(docs);
        assert.deepEqual( docs, [] );
        done();
      });
    });
  
    it("store some data", function (done) {
      storage.store('persons', sampleData, function (err, doc) {
        assert.ifError(err);
        assert.deepEqual(doc, sampleData);
        done();
      });
    });
  
    it("retrieve it", function (done) {
      storage.retrieve('persons', sampleData.id, function (err, doc) {
        assert.ifError(err);
        assert(doc, "found the document");
        assert.deepEqual( doc, sampleData );
        done();
      });
    });
  
    it("list it", function (done) {
      storage.list('persons', function (err, docs) {
        assert.ifError(err);
        assert(docs, "found the document");
        assert.deepEqual( docs, [sampleData] );
        done();
      });
    });

    it("delete it", function (done) {
      storage.delete('persons', sampleData.id, function (err) {
        assert.ifError(err);
        done();
      });
    });
  
    it("now gone", function (done) {
      storage.retrieve('persons', sampleData.id, function (err, doc) {
        assert.ifError(err);
        assert(!doc);
        done();
      });
    });
  });
  
  
  describe("error checking", function () {
  
    it("can't store doc without an id", function (done) {
      storage.store('persons', {foo: 'bar'}, function (err, doc) {
        assert(err);
        assert(!doc);
        assert.equal(err.message, "Can't store document without an id");
        done();
      });
    });
  
  });
    
});
