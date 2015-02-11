"use strict";

var supertest     = require("supertest"),
    async         = require('async'),
    assert        = require('assert'),
    fixture       = require("./fixture"),
    defaults      = require("./defaults"),
    packageJSON   = require("../package"),
    serverApp     = require("../test-server-app"),
    person        = require('./util').person,
    mongoose      = require('mongoose'),
    zlib          = require('zlib'),
    dropElasticsearchIndex = require('./util').dropElasticsearchIndex,
    refreshElasticsearchIndex = require('./util').refreshElasticsearchIndex,
    apiApp = require('..');

require('../src/models');

var request = supertest(serverApp);

describe("REST", function () {

  beforeEach(fixture.clearDatabase);

  before(function() {
    mongoose.connect('mongodb://localhost/' + defaults.databaseName);
  });

  after(function(done) {
    mongoose.connection.close(done);
  });

  describe("malformed requests", function () {
    describe("Content-Type of 'json' but no body", function () {
      it("should not 400", function (done) {
        request
          .del("/api/v0.1/persons/123")
          .type('json') // to force the application/json content type header
          .send("")     // don't send anything
          .expect(204)
          .end(done);
      });
    });
  });

  describe("/api/v0.1 ", function () {
    it("should 200 with API info", function (done) {
      request
        .get("/api/v0.1")
        .expect(200)
        .expect({
          note: "This is the API entry point - use a '*_api_url' link in 'meta' to search a collection.",
          info: {
            databaseName: defaults.databaseName,
            version:      packageJSON.version,
          },
          meta: {
            persons_api_url: '/persons',
            organizations_api_url: '/organizations',
            memberships_api_url: '/memberships',
            posts_api_url: '/posts',
            export_url: '/export.json',
            image_proxy_url: ''
          },
        })
        .end(done);
      
    });
  });

  describe("/api/v0.1/collectionName", function () {

    describe("GET", function () {

      it("should return empty list", function (done) {
        async.each( [ 'persons', 'memberships', 'organizations', 'posts' ], function(type, callback) {
            request
              .get("/api/v0.1/" + type)
              .expect(200)
              .end(function(err, res) {
                assert.ifError(err);
                assert.equal(res.body.result.length, 0);
                callback();
              });
          }, done);
      });

      describe("should return created", function () {
        beforeEach(fixture.loadFixtures);

        it('persons', function(done) {
          request
            .get("/api/v0.1/persons")
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }
              assert.equal('fred-bloggs', res.body.result[0].id);
              assert.equal('Fred Bloggs', res.body.result[0].name);
              assert.equal('joe-bloggs', res.body.result[1].id);
              assert.equal('Joe Bloggs', res.body.result[1].name);
              done();
            });
        });

        it('organizations', function(done) {
          request
            .get("/api/v0.1/organizations")
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }
              assert.equal('parliament', res.body.result[0].id);
              assert.equal('Houses of Parliament', res.body.result[0].name);
              assert.equal('commons', res.body.result[1].id);
              assert.equal('House of Commons', res.body.result[1].name);
              done();
            });
        });

        it('memberships', function(done) {
          request
            .get("/api/v0.1/memberships")
            .expect(200)
            .expect({
              total: 2,
              page: 1,
              per_page: 30,
              has_more: false,
              result: [
                { id: 'oldMP', post_id: 'avalon', organization_id: 'commons', role: 'Member of Parliament',
                  member: {'@type': 'Person', id: 'fred-bloggs'}, start_date: '2000', end_date: '2004', links: [], contact_details: [] },
                { id: 'backAsMP', post_id: 'avalon', organization_id: 'commons', role: 'Member of Parliament',
                  member: {'@type': 'Person', id: 'fred-bloggs'}, start_date: '2011', links: [], contact_details: [] },
              ],
            })
            .end(done);
        });

        it('posts', function(done) {
          request
            .get("/api/v0.1/posts")
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              assert.equal(2, res.body.result.length);
              assert.equal(2, res.body.result[1].memberships.length);

              done();
            });
        });
      });

    });

    describe("POST", function () {

      it("should create entry and return Location when valid", function (done) {
        async.waterfall([
          function(callback){
            request
              .post("/api/v0.1/persons")
              .send({ name: "Joe Bloggs" })
              .expect(200)
              .end(function (err, res) {
                assert(res.body.result.id);
                assert(res.body.result.name);
                callback(err, res.body.result.id);
              });
          },
          function(id, callback){
            request
              .get("/api/v0.1/persons/" + id)
              .expect(200)
              .end(function (err, res) {
                assert(res.body.result.id);
                assert(res.body.result.name);
                callback(err);
              });
          },
        ], done);
      });

      it("should create entry using provided id", function (done) {
        async.series([
          function(callback){

            var personDoc = person({ id: 'test', name: "Joe Bloggs" });
            request
              .post("/api/v0.1/persons")
              .send(personDoc)
              .expect(200)
              .expect({ result: personDoc })
              .end(callback);
          },
          function(callback){
            request
              .get('/api/v0.1/persons/test')
              .expect(200)
              .expect({ result: person({ id: 'test', name: "Joe Bloggs" }) })
              .end(callback);
          },
        ], done);
      });

      it("should error when not valid (bad name)", function (done) {
        request
          .post("/api/v0.1/persons")
          .send({ name: 123, meme: "Harlem Shake" }) // name should be string
          .expect(400)
          .expect("Content-Type", "application/json; charset=utf-8")
          .expect({
            errors: [ "Error 'Instance is not a required type' with 'http://popoloproject.com/schemas/person.json#/properties/name'." ]
          })
          .end(done);
      });

      it("should error when not valid (missing name)", function (done) {
        request
          .post("/api/v0.1/persons")
          .send({ meme: "Harlem Shake" }) // no name
          .expect(400)
          .expect("Content-Type", "application/json; charset=utf-8")
          .expect({
            errors: [ "Error 'Property is required' with 'http://popoloproject.com/schemas/person.json#/properties/name'." ]
          })
          .end(done);
      });

      it("should accept arbitrary fields and save them", function(done) {
        request
          .post("/api/v0.1/persons")
          .send({id: 'test', name: 'Test', meme: 'Harlem Shake', tags: ['music', 'shaking']})
          .expect(200)
          .expect({
            result: person({id: 'test', name: 'Test', meme: 'Harlem Shake', tags: ['music', 'shaking']})
          }, done);
      });

      it("should return an image attribute when adding images", function(done) {
        request
          .post("/api/v0.1/persons")
          .send({id: 'test', name: 'Test', images: [ { url: 'http://example.com/image.png' }]})
          .expect(200)
          .expect({
            result: person({id: 'test', name: 'Test', image: 'http://example.com/image.png', images: [ { url: 'http://example.com/image.png' }]})
          }, done);
      });

      it("should return an set the image attribute to the first image from images", function(done) {
        request
          .post("/api/v0.1/persons")
          .send({id: 'test', name: 'Test', images: [ { url: 'http://example.com/image.png' }, { url: 'http://example.org/image2.png' } ]})
          .expect(200)
          .expect({
            result: person({id: 'test', name: 'Test', image: 'http://example.com/image.png', images: [ { url: 'http://example.com/image.png' }, { url: 'http://example.org/image2.png' } ]})
          }, done);
      });

      it("should add an image to the images array", function(done) {
        request
          .post("/api/v0.1/persons")
          .send({id: 'test', name: 'Test', image: 'http://example.com/image.png' })
          .expect(200)
          .expect({
            result: person({id: 'test', name: 'Test', image: 'http://example.com/image.png', images: [ { url: 'http://example.com/image.png' }]})
          }, done);
      });

    });

    describe("PUT", function () {
      it("should 405", function (done) {
        request
          .put("/api/v0.1/persons")
          .send([{id: "test", name: "Foo"}])
          .expect(405)
          .end(done);
      });
    });

    describe("DELETE", function () {
      it("should 405", function (done) {
        request
          .del("/api/v0.1/persons")
          .expect(405)
          .end(done);
      });
    });

  });

  describe("/api/v0.1/collectionName/id", function () {

    describe("GET", function () {

      beforeEach(fixture.loadFixtures);

      it("should 200 when doc exists", function (done) {
        request
          .get("/api/v0.1/persons/fred-bloggs")
          .expect(200, done);
      });

      it("should 404 when doc does not exist", function (done) {
        request
          .get("/api/v0.1/persons/i-do-not-exist")
          .expect(404)
          .expect({
            errors: [ "id 'i-do-not-exist' not found" ]
          })
          .end(done);
      });

      describe("when id and _id don't match for some reason", function() {
        beforeEach(function(done) {
          mongoose.model('Membership').create({
            _id: 'abc',
            id: '123',
          }, done);
        });

        it("should always return the correct id", function(done) {
          request
            .get("/api/v0.1/memberships/abc")
            .expect(200, function(err, res) {
              assert.ifError(err);
              assert.equal(res.body.result.id, "abc");
              done();
            });
        });
      });

    });

    describe("POST", function () {
      it("should 405", function (done) {
        request
          .post("/api/v0.1/persons/does-not-exist")
          .send({name: "Foo"})
          .expect(405)
          .end(done);
      });
    });

    describe("PUT", function () {

      it("should create entry and return Location when valid", function (done) {
        async.series([
          function(callback){
            request
              .put("/api/v0.1/persons/test")
              .send({ name: "Joe Bloggs" })
              .expect(200)
              .expect({ result: person({ id: "test", name: "Joe Bloggs" }) })
              .end(callback);
          },
          function(callback){
            request
              .get("/api/v0.1/persons/test")
              .expect(200)
              .expect({ result: person({ id: "test", name: "Joe Bloggs" }) })
              .end(callback);
          },
          function(callback){
            request
              .put("/api/v0.1/persons/test")
              .send({ id: 'test', name: "Fred Smith" })
              .expect(200)
              .expect({ result: person({ id: "test", name: "Fred Smith" }) })
              .end(callback);
          },
          function(callback){
            request
              .get("/api/v0.1/persons/test")
              .expect(200)
              .expect({ result: person({ id: "test", name: "Fred Smith" }) })
              .end(callback);
          },
        ], done);
      });

      it("should error if url id and doc id differ", function (done) {
        request
          .put("/api/v0.1/persons/test")
          .send({ id: "different", name: "Joe Bloggs" })
          .expect(400)
          .expect({errors: ["URL id and document id are different"]})
          .end(done);
      });

      it("should error when not valid (bad name)", function (done) {
        request
          .put("/api/v0.1/persons/test")
          .send({ name: 123, meme: "Harlem Shake" }) // name should be string
          .expect(400)
          .end(done);
      });

    });


    describe("DELETE", function () {

      beforeEach(fixture.loadFixtures);

      it("document that does exist", function (done) {
        async.series([
          function(callback){
            request
              .del("/api/v0.1/persons/fred-bloggs")
              .expect(204)
              .end(callback);
          },
          function(callback){
            request
              .get('/api/v0.1/persons/fred-bloggs')
              .expect(404)
              .end(callback);
          },
        ], done);
      });

      it("document that does not exist", function (done) {
        request
          .del("/api/v0.1/persons/does-not-exist")
          .expect(204)
          .end(done);
      });

    });

  });

  describe("GET /search/:collection", function() {
    this.timeout(5000);

    beforeEach(dropElasticsearchIndex(defaults.databaseName.toLowerCase()));

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
        doc.on('es-indexed', done);
      });
    });

    beforeEach(refreshElasticsearchIndex(defaults.databaseName.toLowerCase()));

    it("returns names when searching", function(done) {
      request.get('/api/v0.1/search/persons?q=Barnaby')
      .expect(200)
      .expect({
        total: 1,
        page: 1,
        per_page: 30,
        has_more: false,
        result: [
          person({id: 'bby', name: 'Barnaby', email: 'barnaby@example.org'})
        ]
      }, done);
    });

    describe("'url' property", function() {
      var apiRequest;
      before(function() {
        apiRequest = supertest(apiApp({
          databaseName: defaults.databaseName,
          apiBaseUrl: 'http://example.org'
        }));
      });

      it("is formatted correctly", function(done) {
        apiRequest.get('/v0.1/search/persons?q=Barnaby')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result[0].url, 'http://example.org/persons/bby');
          done();
        });
      });
    });
  });

  describe("api links", function() {
    beforeEach(fixture.loadFixtures);

    describe("without correct configuration", function() {
      it("doesn't include links", function(done) {
        request.get('/api/v0.1/persons/joe-bloggs')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert(!res.body.result.url);
          assert(!res.body.result.html_url);
          done();
        });
      });
    });

    describe("with correct configuration", function() {
      var app;

      beforeEach(function() {
        app = supertest(apiApp({
          databaseName: defaults.databaseName,
          apiBaseUrl: 'http://example.com/v0.1',
          baseUrl: 'http://example.com'
        }));
      });

      it("includes 'url' links when configured correctly", function(done) {
        app.get('/v0.1/persons/joe-bloggs')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.url, 'http://example.com/v0.1/persons/joe-bloggs');
          done();
        });
      });

      describe("html_url", function() {
        beforeEach(function(done) {
          app.post('/v0.1/persons')
          .send({id: 'test', name: 'Test'})
          .expect(200)
          .end(done);
        });

        it("is present", function(done) {
          app.get('/v0.1/persons/test')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.html_url, 'http://example.com/persons/test');
            done();
          });
        });
      });

      describe("embedded documents 'url' property", function() {
        it("is correct", function(done) {
          app.get('/v0.1/persons/fred-bloggs')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.memberships[0].url, 'http://example.com/v0.1/memberships/oldMP');
            done();
          });
        });
      });
    });
  });

  describe("pagination", function() {

    beforeEach(function(done) {
      var Person = mongoose.model('Person');
      async.times(40, function(n, next) {
        Person.create({_id: n, name: "Person " + n}, next);
      }, done);
    });

    it("defaults to 30 results", function(done) {
      request.get('/api/v0.1/persons')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        assert.equal(res.body.result.length, 30);
        assert.equal(res.body.total, 40);
        assert.equal(res.body.per_page, 30);
        assert.equal(res.body.page, 1);
        assert.equal(res.body.has_more, true);
        done();
      });
    });

    it("allows specifying a 'per_page' parameter", function(done) {
      request.get('/api/v0.1/persons?per_page=10')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        assert.equal(res.body.result.length, 10);
        assert.equal(res.body.total, 40);
        assert.equal(res.body.per_page, 10);
        assert.equal(res.body.page, 1);
        assert.equal(res.body.has_more, true);
        done();
      });
    });

    it("allows specifying a 'page' parameter", function(done) {
      request.get('/api/v0.1/persons?page=2')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        assert.equal(res.body.result.length, 10);
        assert.equal(res.body.total, 40);
        assert.equal(res.body.per_page, 30);
        assert.equal(res.body.page, 2);
        assert.equal(res.body.has_more, false);

        done();
      });
    });

    it("allows specifying both pagination parameters", function(done) {
      request.get('/api/v0.1/persons?per_page=39&page=2')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        assert.equal(res.body.result.length, 1);
        done();
      });
    });

    describe("next_url/prev_url", function() {
      var app;
      beforeEach(function() {
        app = supertest(apiApp({
          databaseName: defaults.databaseName,
          apiBaseUrl: 'http://example.com'
        }));
      });

      it("adds next_url when there are more results", function(done) {
        app.get('/v0.1/persons')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert(res.body.has_more);
          assert(!res.body.prev_url);
          assert.equal(res.body.next_url, 'http://example.com/v0.1/persons?page=2');
          done();
        });
      });

      it("adds prev_url when not on the first page", function(done) {
        app.get('/v0.1/persons?page=2')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert(!res.body.has_more);
          assert.equal(res.body.prev_url, 'http://example.com/v0.1/persons?page=1');
          assert(!res.body.next_url);
          done();
        });
      });

      it("preserves the rest of the query string", function(done) {
        app.get('/v0.1/persons?per_page=10')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert(res.body.has_more);
          assert.equal(res.body.next_url, 'http://example.com/v0.1/persons?per_page=10&page=2');
          assert(!res.body.prev_url);
          done();
        });
      });
    });
  });

  describe("removing the API's root wrapper", function() {
    beforeEach(fixture.loadFixtures);

    it("works for GET /:collection/:id", function(done) {
      request.get('/api/v0.1/persons/fred-bloggs?include_root=false')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.name, "Fred Bloggs");
        done();
      });
    });

    it("works for PUT /:collection/:id", function(done) {
      request.put('/api/v0.1/persons/fred-bloggs?include_root=false')
      .send({name: 'Fred Bloggs'})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.name, "Fred Bloggs");
        done();
      });
    });

    it("works for POST /:collection", function(done) {
      request.post('/api/v0.1/persons?include_root=false')
      .send({name: 'Bob Example'})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.name, "Bob Example");
        done();
      });
    });

  });

  describe("embedding memberships", function() {
    beforeEach(fixture.loadFixtures);

    it("embeds memberships by default", function(done) {
      request.get('/api/v0.1/persons/fred-bloggs')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 2);
        assert.equal(res.body.result.memberships[0].organization_id, 'commons');
        done();
      });
    });

    it("embeds organizations when requested", function(done) {
      request.get('/api/v0.1/persons/fred-bloggs?embed=membership.organization')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships[0].organization_id.name, 'House of Commons');
        done();
      });
    });

  });

  describe("merging people", function() {
    beforeEach(fixture.loadFixtures);
    var Person = mongoose.model('Person');
    var person;

    beforeEach(function(done) {
      person = new Person({_id: 'fred-bloggs-2', name: 'Fred Bloggs', gender: 'male'});
      person.save(done);
    });

    it("works for two similar people", function(done) {
      request.post('/api/v0.1/persons/fred-bloggs/merge/fred-bloggs-2')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.gender, 'male');
        request.get('/api/v0.1/persons/fred-bloggs-2').expect(404, done);
      });
    });

    it("returns an error if you try to merge a person into themselves", function(done) {
      request.post('/api/v0.1/persons/fred-bloggs/merge/fred-bloggs')
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "Can't merge a person into themselves");
        done();
      });
    });

    describe("with unresolvable conflicts", function() {
      beforeEach(function(done) {
        person.email = 'f.bloggs@example.org';
        person.save(done);
      });

      it("returns an error", function(done) {
        request.post('/api/v0.1/persons/fred-bloggs/merge/fred-bloggs-2')
        .expect(400)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.errors[0], "Unresolvable merge conflict");
          assert.equal(res.body.errors[1], "Please resolve conflict with email: fbloggs@example.org doesn't match f.bloggs@example.org");
          done();
        });
      });
    });

    it("returns an error if you try to merge something other than a person", function(done) {
      request.post('/api/v0.1/organizations/foo-corp/merge/acme-inc')
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "The merge method currently only works with people");
        done();
      });
    });

  });

  describe("export", function() {
    beforeEach(fixture.loadFixtures);

    it("provides popolo json", function(done) {
      request.get('/api/v0.1/export.json')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(2, res.body.persons.length);
        assert.equal(2, res.body.organizations.length);
        assert.equal(2, res.body.memberships.length);
        assert.equal(2, res.body.posts.length);
        done();
      });
    });

    /**
     * Parser for binary responses
     *
     * @see http://stackoverflow.com/a/14802413
     */
    function binaryParser(res, callback) {
      res.setEncoding('binary');
      res.data = '';
      res.on('data', function(chunk) {
        res.data += chunk;
      });
      res.on('end', function() {
        callback(null, new Buffer(res.data, 'binary'));
      });
    }

    it("provides compressed popolo json", function(done) {
      request.get('/api/v0.1/export.json.gz')
      .expect(200)
      .parse(binaryParser)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal('application/octet-stream', res.header['content-type']);
        assert(res.header['content-disposition'].indexOf('export.json.gz') !== -1);
        zlib.unzip(res.body, function(err, json) {
          assert.ifError(err);
          var popolo = JSON.parse(json);
          assert.equal(2, popolo.persons.length);
          assert.equal(2, popolo.organizations.length);
          assert.equal(2, popolo.memberships.length);
          assert.equal(2, popolo.posts.length);
          done();
        });
      });
    });

  });

  describe("inline memberships", function() {
    beforeEach(fixture.loadFixtures);

    it("creates memberships included in POST", function(done) {
      request.post('/api/v1.0.0/persons')
      .send({id: 'bob-example', name: 'Bob Example', memberships: [ { person_id: "bob-example", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        done();
      });
    });

    it("doesn't create memberships included in an organizations POST to 0.1 API", function(done) {
      request.post('/api/v0.1/organizations')
      .send({id: 'new-org', name: 'New Org', memberships: [ { person_id: "bob-example", organization_id: 'new-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v0.1/organizations')
        .end(function(err, res) {
          assert.equal(res.body.result.memberships, undefined);
          done();
        });
      });
    });

    it("creates memberships included in an organizations POST", function(done) {
      request.post('/api/v1.0.0/organizations')
      .send({id: 'new-org', name: 'New Org', memberships: [ { person_id: "bob-example", organization_id: 'new-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        done();
      });
    });

    it("creates memberships included in an post POST", function(done) {
      request.post('/api/v1.0.0/posts')
      .send({id: 'new-post', label: 'New Post', memberships: [ { post_id: "new-post", organization_id: 'new-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        done();
      });
    });

    it("adds the id of the created object to the membership if missing", function(done) {
      request.post('/api/v1.0.0/persons')
      .send({id: 'bob-example', name: 'Bob Example', memberships: [ { organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        assert.equal(res.body.result.memberships[0].person_id, 'bob-example');
        done();
      });
    });

    it("it adds the id of the created org to the membership is missing in a POST", function(done) {
      request.post('/api/v1.0.0/organizations')
      .send({id: 'new-org', name: 'New Org', memberships: [ { person_id: "bob-example" } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0/organizations/new-org')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].organization_id, 'new-org');
          done();
        });
      });
    });

    it("it adds the id of the created post to the membership is missing in a POST", function(done) {
      request.post('/api/v1.0.0/posts')
      .send({id: 'new-post', label: 'New Post', memberships: [ { organization_id: 'new-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0/posts/new-post')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].post_id, 'new-post');
          done();
        });
      });
    });

    it("returns error and doesn't create anything if you try and create a membership for a different doc", function(done) {
      request.post('/api/v1.0.0/persons')
      .send({id: 'bob-example', name: 'Bob Example', memberships: [ { person_id: 'dave-example', organization_id: 'example-org' } ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors.length, 1);
        assert.equal(res.body.errors[0], "person id (dave-example) in membership and person id (bob-example) are mismatched");

        request.get('/api/v1.0.0/persons/bob-example')
        .expect(404)
        .end(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it("returns error and doesn't create anything if you try and create a membership for a different post", function(done) {
      request.post('/api/v1.0.0/posts')
      .send({id: 'new-post', label: 'New Post', memberships: [ { post_id: 'other-post', organization_id: 'new-org' } ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors.length, 1);
        assert.equal(res.body.errors[0], "post id (other-post) in membership and post id (new-post) are mismatched");

        request.get('/api/v1.0.0/posts/new-post')
        .expect(404)
        .end(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it("returns error and doesn't create anything if you try and create several memberships for a different doc", function(done) {
      request.post('/api/v1.0.0/persons')
      .send({id: 'bob-example', name: 'Bob Example', memberships: [
        { person_id: 'bob-example', organization_id: 'example-org' },
        { person_id: 'dave-example', organization_id: 'example-org' }
      ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors.length, 1);
        assert.equal(res.body.errors[0], "person id (dave-example) in membership and person id (bob-example) are mismatched");

        request.get('/api/v1.0.0/persons/bob-example')
        .expect(404)
        .end(function(err) {
          assert.ifError(err);
          request.get('/api/v1.0.0/memberships')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err);
              assert.equal(res.body.total, 2);
              done();
          });
        });
      });
    });

    it("it doesn't create memberships included in v0.1 PUT", function(done) {
      request.put('/api/v0.1/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v0.1/persons/joe-bloggs')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 0);
          done();
        });
      });
    });

    it("creates memberships included in PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v0.1/persons/joe-bloggs')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          done();
        });
      });
    });

    it("creates memberships included in an organizations PUT", function(done) {
      request.put('/api/v1.0.0/organizations/parliament')
      .send({name: 'Houses of Parliament', memberships: [ { person_id: "joe-bloggs", organization_id: 'parliament' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v0.1/organizations/parliament')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          done();
        });
      });
    });

    it("creates memberships included in an post POST", function(done) {
      request.put('/api/v1.0.0/posts/annapolis')
      .send({ label: 'MP for Annapolis', memberships: [ { post_id: "annapolis", organization_id: 'new-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0/posts/annapolis')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].organization_id, 'new-org');
          done();
        });
      });
    });

    it("adds current person_id if missing from memberships included in PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0/persons/joe-bloggs')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].person_id, 'joe-bloggs');
          done();
        });
      });
    });

    it("adds current organization_id if missing from memberships included in PUT", function(done) {
      request.put('/api/v1.0.0/organizations/parliament')
      .send({name: 'Houses of Parliament', memberships: [ { person_id: 'joe-bloggs' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0/organizations/parliament')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].organization_id, 'parliament');
          done();
        });
      });
    });

    it("removes memberships not included in a PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'another-org' } ]})
        .expect(200)
        .end(function(err) {
          assert.ifError(err);
          request.get('/api/v1.0.0/persons/joe-bloggs')
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.memberships.length, 1);
            assert.notEqual(res.body.result.memberships[0].id, mem_id);
            done();
          });
        });
      });
    });

    it("removes all memberships if none included in a PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        request.put('/api/v1.0.0/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [ ]})
        .expect(200)
        .end(function(err) {
          assert.ifError(err);
          request.get('/api/v1.0.0/persons/joe-bloggs')
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.memberships.length, 0);
            done();
          });
        });
      });
    });

    it("memberships are unchanged if no membership key in a PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0/persons/joe-bloggs')
        .send({name: 'Joe Bloggs' })
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 0);
          request.get('/api/v1.0.0/persons/joe-bloggs?embed=membership')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err);
              assert.equal(res.body.result.memberships.length, 1);
              assert.equal(res.body.result.memberships[0].id, mem_id);
              done();
          });
        });
      });
    });

    it("updates existing memberships included in a PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [ { id: mem_id, person_id: "joe-bloggs", organization_id: 'another-org' } ]})
        .expect(200)
        .end(function(err) {
          assert.ifError(err);
          request.get('/api/v1.0.0/persons/joe-bloggs')
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.memberships.length, 1);
            assert.equal(res.body.result.memberships[0].organization_id, 'another-org');
            done();
          });
        });
      });
    });

    it("returns error if person_id mismatched in PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "james-bloggs", organization_id: 'example-org' } ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
        done();
      });
    });

    it("returns error if organization_id mismatched in PUT", function(done) {
      request.put('/api/v1.0.0/organizations/parliament')
      .send({name: 'Houses of Parliament', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "organization id (example-org) in membership and organization id (parliament) are mismatched");
        done();
      });
    });

    it("deletes memberships created if error in PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [
        { person_id: "joe-bloggs", organization_id: 'example-org' },
        { person_id: "james-bloggs", organization_id: 'example-org' }
      ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
        request.get('/api/v1.0.0/persons/joe-bloggs?embed=membership')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.memberships.length, 0);
            done();
        });
      });
    });

    it("deletes memberships created if error in organization PUT", function(done) {
      request.put('/api/v1.0.0/organizations/parliament')
      .send({name: 'Houses of Parliament', memberships: [
        { person_id: "joe-bloggs", organization_id: 'parliament' },
        { person_id: "joe-bloggs", organization_id: 'example-org' }
      ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "organization id (example-org) in membership and organization id (parliament) are mismatched");
        request.get('/api/v1.0.0/organizations/parliament?embed=membership')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.memberships.length, 0);
            done();
        });
      });
    });

    it("restores existing memberships if there's an error in a PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [{ person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [
          { id: mem_id, person_id: "joe-bloggs", organization_id: 'another-org' },
          { person_id: "james-bloggs", organization_id: 'example-org' }
        ]})
        .expect(400)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
          request.get('/api/v1.0.0/persons/joe-bloggs?embed=membership')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err);
              assert.equal(res.body.result.memberships.length, 1);
              assert.equal(res.body.result.memberships[0].id, mem_id);
              assert.equal(res.body.result.memberships[0].organization_id, 'example-org');
              done();
          });
        });
      });
    });

    it("restores deleted memberships if there's an error in a PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [{ person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [
          { person_id: "james-bloggs", organization_id: 'example-org' }
        ]})
        .expect(400)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
          request.get('/api/v1.0.0/persons/joe-bloggs?embed=membership')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err);
              assert.equal(res.body.result.memberships.length, 1);
              assert.equal(res.body.result.memberships[0].id, mem_id);
              assert.equal(res.body.result.memberships[0].organization_id, 'example-org');
              done();
          });
        });
      });
    });

    it("restores existing document if there's an error in a PUT", function(done) {
      request.put('/api/v1.0.0/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [{ person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        request.put('/api/v1.0.0/persons/joe-bloggs')
        .send({name: 'James Bloggs', memberships: [
          { person_id: "james-bloggs", organization_id: 'example-org' }
        ]})
        .expect(400)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
          request.get('/api/v1.0.0/persons/joe-bloggs')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err);
              done();
              assert.equal(res.body.result.name, 'Joe Bloggs');
          });
        });
      });
    });

    it("restores existing organization if there's an error in a PUT", function(done) {
      request.put('/api/v1.0.0/organizations/parliament')
      .send({name: 'The Houses of Parliament', memberships: [
        { person_id: "joe-bloggs", organization_id: 'parliament' },
        { person_id: "joe-bloggs", organization_id: 'example-org' }
      ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "organization id (example-org) in membership and organization id (parliament) are mismatched");
        request.get('/api/v1.0.0/organizations/parliament')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.name, 'Houses of Parliament');
            done();
        });
      });
    });
  });

});
