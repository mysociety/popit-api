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

    it("allows a maximum of 200 items", function() {
      assert.equal(paginate({per_page: 200}).limit, 200);
      assert.equal(paginate({per_page: 201}).limit, 30);
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

  describe("metadata()", function() {
    var pagination;
    var metadata;

    it("returns expected results for page 1", function() {
      pagination = paginate({page: 1});
      metadata = pagination.metadata(42, 'http://example.org/api/persons');

      assert.equal(metadata.total, 42);
      assert.equal(metadata.page, 1);
      assert.equal(metadata.per_page, 30);
      assert.equal(metadata.has_more, true);
      assert.equal(metadata.next_url, 'http://example.org/api/persons?page=2');
      assert(!metadata.prev_url);
    });

    it("returns expected results for page 2", function() {
      pagination = paginate({page: 2});
      metadata = pagination.metadata(42, 'http://example.org/api/persons?page=2');

      assert.equal(metadata.total, 42);
      assert.equal(metadata.page, 2);
      assert.equal(metadata.per_page, 30);
      assert.equal(metadata.has_more, false);
      assert.equal(metadata.prev_url, 'http://example.org/api/persons?page=1');
      assert(!metadata.next_url);
    });

    it("doesn't include unknown parameters in next_url/prev_url", function() {
      pagination = paginate({ page: 1 });
      metadata = pagination.metadata(42, 'http://example.org/api/persons?callback=jQuery999');
      assert.equal(metadata.next_url, 'http://example.org/api/persons?page=2');

      pagination = paginate({ page: 2 });
      metadata = pagination.metadata(42, 'http://example.org/api/persons?page=2&callback=jQuery999');
      assert.equal(metadata.prev_url, 'http://example.org/api/persons?page=1');
    });

    it("preserves useful params such as ?embed and ?q", function() {
      pagination = paginate({ page: 1 });
      metadata = pagination.metadata(42, 'http://example.org/api/persons?embed=membership.person');
      assert.equal(metadata.next_url, 'http://example.org/api/persons?embed=membership.person&page=2');

      pagination = paginate({ page: 1 });
      metadata = pagination.metadata(42, 'http://example.org/api/search/persons?q=Bob');
      assert.equal(metadata.next_url, 'http://example.org/api/search/persons?q=Bob&page=2');

      pagination = paginate({ page: 1 });
      metadata = pagination.metadata(42, 'http://example.org/api/search/persons?embed=membership.person&q=Bob');
      assert.equal(metadata.next_url, 'http://example.org/api/search/persons?embed=membership.person&q=Bob&page=2');

      pagination = paginate({ page: 1 });
      metadata = pagination.metadata(42, 'http://example.org/api/search/persons?embed=&q=Bob');
      assert.equal(metadata.next_url, 'http://example.org/api/search/persons?embed=&q=Bob&page=2');
    });
  });
});
