"use strict";

var supertest     = require("supertest"),
    assert        = require("assert"),
    fixture       = require("./fixture"),
    defaults      = require("./defaults"),
    serverApp     = require("../test-server-app"),
    mongoose      = require('mongoose'),
    dropElasticsearchIndex = require('./util').dropElasticsearchIndex,
    createElasticsearchIndex = require('./util').createElasticsearchIndex;

require('../src/models');

var request = supertest(serverApp);

describe("RESOLVE", function () {
  this.timeout(15000);

  beforeEach(fixture.clearDatabase);

  // TODO: needs to set up the mapping when it creates the index so that the
  //       nested membership things work correctly
  before(function(done) {
    createElasticsearchIndex(defaults.databaseName.toLowerCase() + '_resolve')(function() {
      mongoose.connect('mongodb://localhost/' + defaults.databaseName, done);
    });
  });

  after(function(done) {
    dropElasticsearchIndex(defaults.databaseName.toLowerCase() + '_resolve')(function() {
      mongoose.connection.close(done);
    });
  });

  describe('name resolution', function() {

    beforeEach(function(done) {
      mongoose.model('Person').create({
        _id: 'bby',
        id: 'bby',
        name: 'Barnaby',
        email: 'barnaby@example.org'
      }, function(err, doc) {
        if (err) {
          return done(err);
        }
        doc.on('es-resolve-indexed', function() { setTimeout(done, 1000);});
      });
    });

    it("returns names when searching", function(done) {
      request.get('/api/v0.1/persons/resolve?name=Barnaby')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.length, 1);
        var result = res.body.result[0];
        delete( result.score );
        assert.deepEqual(result, {
            id: 'bby',
            name: 'Barnaby',
            email: 'barnaby@example.org',
            memberships: [],
            links: [],
            contact_details: [],
            identifiers: [],
            other_names: []
          }
        );
        done();
      });
    });
  });

});
