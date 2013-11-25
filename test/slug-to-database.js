"use strict";

var assert = require('assert');
var slugToDatabase = require("../src/slug-to-database");

describe("slugToDatabase", function() {
  it("doesn't change short slugs", function() {
    var slug = 'popit-api-cores-por-antartica-chilena-con-mucho-frio';
    assert.equal(slug, slugToDatabase(slug));
  });

  it("truncates and appends a hash for long slugs", function() {
    var slug = 'popit-api-cores-por-antartica-chilena-con-mucho-frio-popit-votainteligente-org';
    assert.equal('popit-api-cores-por-antartica--aec65846b4e17b4b5cfd7be23b769ae2', slugToDatabase(slug));
    assert.equal(63, slugToDatabase(slug).length);
  });
});
