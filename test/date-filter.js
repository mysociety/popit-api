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
        },
        {
          _id: 'fred-in-parliament',
          organization_id: 'foo',
          person_id: 'fred-bloggs',
          legislative_period_id: 'parliament-55'
        }
      ],
      events: [
        {
          _id: 'parliament-55',
          name: '55th Parliament of the United Kingdom',
          start_date: '2010-05-25',
          end_date: '2015-03-26'
        }
      ]
    }, done);
  });

  it("removes fields that don't span the ?at parameter", function(done) {
    request.get('/api/v0.1/persons/fred-bloggs?at=2010-02-03')
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
          contact_details: [],
          images: []
        },
        { id: 'fred-in-parliament',
          contact_details: [],
          links: [],
          images: [],
          legislative_period_id: 'parliament-55',
          person_id: 'fred-bloggs',
          organization_id: 'foo'
        }
      ]);
      done();
    });
  });

  describe("v1.0.0", function() {
    it("removes memberships with legislatures that don't span the ?at parameter", function(done) {
      request.get('/api/v1.0.0-alpha/persons/fred-bloggs?embed=membership.legislative_period&at=2010-02-03')
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
            legislative_period: null,
            start_date: '2009-10-10',
            end_date: '2010-10-10',
            links: [],
            contact_details: [],
            images: []
          }
        ]);
        done();
      });
    });

  });
});
