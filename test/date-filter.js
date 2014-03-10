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
        },
        {
          _id: 'john-doe',
          name: 'John Doe',
          birth_date: '1900-01-01',
          death_date: '1999-01-01'
        },
        {
          _id: 'jane-doe',
          name: 'Jane Doe',
          birth_date: '1999-01-01'
        }
      ],
      organizations: [
        {_id: 'foo', name: 'Foo'},
        {_id: 'bar', name: 'Bar'}
      ],
      memberships: [
        {
          _id: 'fred-at-foo',
          organization_id: 'foo',
          person_id: 'fred-bloggs',
          start_date: '2009-10-10',
          end_date: '2010-10-10'
        },
        {
          _id: 'fred-at-bar',
          organization_id: 'bar',
          person_id: 'fred-bloggs',
          start_date: '2010-10-11'
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
      assert.deepEqual(res.body.result.memberships, [
        {
          id: 'fred-at-foo',
          organization_id: 'foo',
          person_id: 'fred-bloggs',
          start_date: '2009-10-10',
          end_date: '2010-10-10',
          links: [],
          contact_details: []
        }
      ]);
      done();
    });
  });

  it("removes documents that wouldn't have existed on the given date", function(done) {
    request.get('/api/persons?at=2010-02-01')
    .expect(200)
    .end(function(err, res) {
      assert.ifError(err);
      assert.equal(res.body.result.length, 2);
      done();
    });
  });
});
