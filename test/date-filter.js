"use strict";

var assert = require('assert');
var fixtures = require('pow-mongodb-fixtures');
var defaults = require('./defaults');
var supertest = require('supertest');
var popitApp = require('../test-server-app');

describe("Filter by date", function() {
  var fixture = fixtures.connect(defaults.databaseName);
  var request = supertest(popitApp);

  beforeEach(function(done) {
    fixture.clearAllAndLoad({
      persons: [
        {
          _id: 'fred-bloggs',
          name: 'Fred Bloggs',
          other_names: [
            {name: 'Fred'},
            {name: 'Freddy B', start_date: '2012-09-04'},
            {name: 'Alfred Bloggs', start_date: '2009-10-12'},
            {name: 'Mr Bloggs', start_date: '2008-12-12', end_date: '2009-01-01'}
          ]
        }
      ]
    }, done);
  });

  it("removes fields that don't span the ?at parameter", function(done) {
    request.get('/api/persons/fred-bloggs?at=2010-02-03')
    .expect(200)
    .end(function(err, res) {
      assert.ifError(err);
      assert.deepEqual(res.body.result.other_names, [
        {name: 'Fred'},
        {name: 'Alfred Bloggs', start_date: '2009-10-12'}
      ]);
      done();
    });
  });
});
