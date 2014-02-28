"use strict";

var assert = require('assert');
var paginate = require('../src/paginate');

describe("paginate", function() {
  describe("limit", function() {
    it("defaults to 30", function() {
      assert.equal(paginate().limit, 30);
    });

    it("allows specifying custom limit with per_page", function() {
      assert.equal(paginate({per_page: 42}).limit, 42);
      assert.equal(paginate({per_page: 86}).limit, 86);
    });

    it("allows a maximum of 100 items", function() {
      assert.equal(paginate({per_page: 100}).limit, 100);
      assert.equal(paginate({per_page: 101}).limit, 30);
    });

    it("allows a minimum of 1 item", function() {
      assert.equal(paginate({per_page: 0}).limit, 30);
      assert.equal(paginate({per_page: -1}).limit, 30);
    });
  });

  describe("skip", function() {
    it("defaults to 0", function() {
      assert.equal(paginate({}).skip, 0);
      assert.equal(paginate({per_page: 100}).skip, 0);
      assert.equal(paginate({page: 1, per_page: 100}).skip, 0);
    });

    it("uses 'page' parameter to calculate skip value", function() {
      assert.equal(paginate({page: 2}).skip, 30);
      assert.equal(paginate({page: 3}).skip, 60);
      assert.equal(paginate({per_page: 5, page: 5}).skip, 20);
    });

    it("allows a maximum of 1000 pages", function() {
      assert.equal(paginate({page: 1000}).skip, 29970);
      assert.equal(paginate({per_page: 100, page: 1000}).skip, 99900);
      assert.equal(paginate({page: 1001}).skip, 0);
    });

    it("doesn't allow 'page' parameter to be less than 1", function() {
      assert.equal(paginate({page: 0}).skip, 0);
      assert.equal(paginate({page: -1}).skip, 0);
    });
  });

  describe("hasMore()", function() {
    it("returns false if there are no more results pages", function() {
      assert.equal(paginate({page: 1}).hasMore(30), false);
      assert.equal(paginate({page: 1}).hasMore(31), true);
      assert.equal(paginate({page: 1, per_page: 31}).hasMore(31), false);
      assert.equal(paginate({page: 1}).hasMore(40), true);
      assert.equal(paginate({page: 2}).hasMore(40), false);
    });
  });
});
