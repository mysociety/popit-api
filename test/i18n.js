"use strict";

var i18n = require('../src/i18n');
var assert = require('assert');
var fixtures = require('pow-mongodb-fixtures');
var defaults = require('./defaults');
var supertest = require('supertest');
var popitApp = require('../test-server-app');
var mongoose = require('mongoose');
var dropElasticsearchIndex = require('./util').dropElasticsearchIndex;

describe("internationalization", function() {
  var json = {
    name: {
      en: 'Chris',
      ru: 'Крис'
    }
  };

  it("converts translated documents to popolo", function() {
    assert.equal(i18n(json, ['en']).name, 'Chris');
    assert.equal(i18n(json, ['ru']).name, 'Крис');
  });

  it("uses the default language when there is no match", function() {
    assert.equal(i18n(json, ['es'], 'en').name, 'Chris');
    assert.equal(i18n(json, ['es'], 'ru').name, 'Крис');
  });

  it("returns an empty string when no languages match", function() {
    assert.equal(i18n(json, ['es'], 'de').name, '');
  });

  it("translates fields in nested custom objects", function() {
    var input = {foo: {name: {en: 'Foo', es: 'Fu'}}};
    assert.deepEqual(i18n(input, ['en'], 'en'), {foo: {name: 'Foo'}});
  });

  it("translates fields in nested custom arrays", function() {
    var input = {
      foo: [
        {name: {en: 'Foo', es: 'Fu'}, other: {en: 'Other', es: 'Othere'}}
      ]
    };
    var expected = {foo: [{name: 'Foo', other: 'Other'}]};
    assert.deepEqual(i18n(input, ['en'], 'en'), expected);
  });

  describe("translating documents in the API", function() {
    var fixture = fixtures.connect(defaults.databaseName);
    var request = supertest(popitApp);
    beforeEach(function(done) {
      fixture.clearAllAndLoad({
        persons: [
          { _id: 'fred-bloggs', name: { en: 'Fred Bloggs', ru: 'Фред Влоггс' } }
        ]
      }, done);
    });

    it("allows documents to be created over the API", function(done) {
      request.post('/api/persons')
      .send({
        name: {
          en: 'Chris',
          ru: 'Крис'
        },
        links: [
          {url: 'http://example.org', note: {en: 'Example', es: 'Ejemplo'}}
        ]
      })
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.name, 'Chris');
        assert.equal(res.body.result.links[0].note, 'Example');
        done();
      });
    });

    it("returns the document in the requested language", function(done) {
      request.get('/api/persons/fred-bloggs')
      .set('Accept-Language', 'en')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.name, 'Fred Bloggs');
        done();
      });
    });

    it("returns all translations if requested", function(done) {
      request.get('/api/persons/fred-bloggs/full')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.deepEqual(res.body.result.name, {"ru":"Фред Влоггс","en":"Fred Bloggs"});
        done();
      });
    });
  });

  describe("search", function() {
    this.timeout(5000);
    var Person;

    before(function() {
      mongoose.connect('mongodb://localhost/' + defaults.databaseName);
      Person = mongoose.model('Person');
    });

    before(function(done) {
      dropElasticsearchIndex(Person.indexName())(done);
    });

    after(function(done) {
      mongoose.connection.close(done);
    });

    beforeEach(function(done) {
      var person = new Person({_id: 'foo', id: 'foo', name: 'Foo'});
      person.save(function(err) {
        assert.ifError(err);
        person.on('es-indexed', done);
      });
    });

    it("doesn't give an error when indexing", function(done) {
      var person = new Person();
      person._id = person.id = 'chris';
      person.name = {en: 'Chris', ru: 'Крис'};
      person.save(function(err) {
        assert.ifError(err);
        person.on('es-indexed', function(err) {
          assert.ifError(err);
          done();
        });
      });
    });
  });
});
