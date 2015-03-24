"use strict";

var fixture = require('./fixture');
var supertest = require('supertest');
var serverApp = require('../test-server-app');
var assert = require('assert');

var request = supertest(serverApp);

describe("REST API v1.0.0-alpha", function () {

  describe("inline memberships", function() {
    beforeEach(fixture.loadFixtures);

    it("creates memberships included in POST", function(done) {
      request.post('/api/v1.0.0-alpha/persons')
      .send({id: 'bob-example', name: 'Bob Example', memberships: [ { person_id: "bob-example", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        done();
      });
    });

    it("creates memberships included in an organizations POST", function(done) {
      request.post('/api/v1.0.0-alpha/organizations')
      .send({id: 'new-org', name: 'New Org', memberships: [ { person_id: "bob-example", organization_id: 'new-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        done();
      });
    });

    it("creates memberships included in an post POST", function(done) {
      request.post('/api/v1.0.0-alpha/posts')
      .send({id: 'new-post', label: 'New Post', memberships: [ { post_id: "new-post", organization_id: 'new-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        done();
      });
    });

    it("adds the id of the created object to the membership if missing", function(done) {
      request.post('/api/v1.0.0-alpha/persons')
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
      request.post('/api/v1.0.0-alpha/organizations')
      .send({id: 'new-org', name: 'New Org', memberships: [ { person_id: "bob-example" } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0-alpha/organizations/new-org')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].organization_id, 'new-org');
          done();
        });
      });
    });

    it("it adds the id of the created post to the membership is missing in a POST", function(done) {
      request.post('/api/v1.0.0-alpha/posts')
      .send({id: 'new-post', label: 'New Post', memberships: [ { organization_id: 'new-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0-alpha/posts/new-post')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].post_id, 'new-post');
          done();
        });
      });
    });

    it("returns error and doesn't create anything if you try and create a membership for a different doc", function(done) {
      request.post('/api/v1.0.0-alpha/persons')
      .send({id: 'bob-example', name: 'Bob Example', memberships: [ { person_id: 'dave-example', organization_id: 'example-org' } ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors.length, 1);
        assert.equal(res.body.errors[0], "person id (dave-example) in membership and person id (bob-example) are mismatched");

        request.get('/api/v1.0.0-alpha/persons/bob-example')
        .expect(404)
        .end(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it("returns error and doesn't create anything if you try and create a membership for a different post", function(done) {
      request.post('/api/v1.0.0-alpha/posts')
      .send({id: 'new-post', label: 'New Post', memberships: [ { post_id: 'other-post', organization_id: 'new-org' } ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors.length, 1);
        assert.equal(res.body.errors[0], "post id (other-post) in membership and post id (new-post) are mismatched");

        request.get('/api/v1.0.0-alpha/posts/new-post')
        .expect(404)
        .end(function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it("returns error and doesn't create anything if you try and create several memberships for a different doc", function(done) {
      request.post('/api/v1.0.0-alpha/persons')
      .send({id: 'bob-example', name: 'Bob Example', memberships: [
        { person_id: 'bob-example', organization_id: 'example-org' },
        { person_id: 'dave-example', organization_id: 'example-org' }
      ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors.length, 1);
        assert.equal(res.body.errors[0], "person id (dave-example) in membership and person id (bob-example) are mismatched");

        request.get('/api/v1.0.0-alpha/persons/bob-example')
        .expect(404)
        .end(function(err) {
          assert.ifError(err);
          request.get('/api/v1.0.0-alpha/memberships')
            .expect(200)
            .end(function(err, res) {
              assert.ifError(err);
              assert.equal(res.body.total, 2);
              done();
          });
        });
      });
    });

    it("creates memberships included in PUT", function(done) {
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0-alpha/persons/joe-bloggs')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          done();
        });
      });
    });

    it("creates memberships included in an organizations PUT", function(done) {
      request.put('/api/v1.0.0-alpha/organizations/parliament')
      .send({name: 'Houses of Parliament', memberships: [ { person_id: "joe-bloggs", organization_id: 'parliament' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0-alpha/organizations/parliament')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          done();
        });
      });
    });

    it("creates memberships included in an post POST", function(done) {
      request.put('/api/v1.0.0-alpha/posts/annapolis')
      .send({ label: 'MP for Annapolis', memberships: [ { post_id: "annapolis", organization_id: 'new-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0-alpha/posts/annapolis')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].organization_id, 'new-org');
          done();
        });
      });
    });

    it("adds current person_id if missing from memberships included in PUT", function(done) {
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0-alpha/persons/joe-bloggs')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].person_id, 'joe-bloggs');
          done();
        });
      });
    });

    it("adds current organization_id if missing from memberships included in PUT", function(done) {
      request.put('/api/v1.0.0-alpha/organizations/parliament')
      .send({name: 'Houses of Parliament', memberships: [ { person_id: 'joe-bloggs' } ]})
      .expect(200)
      .end(function(err) {
        assert.ifError(err);
        request.get('/api/v1.0.0-alpha/organizations/parliament')
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 1);
          assert.equal(res.body.result.memberships[0].organization_id, 'parliament');
          done();
        });
      });
    });

    it("removes memberships not included in a PUT", function(done) {
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'another-org' } ]})
        .expect(200)
        .end(function(err) {
          assert.ifError(err);
          request.get('/api/v1.0.0-alpha/persons/joe-bloggs')
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
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [ ]})
        .expect(200)
        .end(function(err) {
          assert.ifError(err);
          request.get('/api/v1.0.0-alpha/persons/joe-bloggs')
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.memberships.length, 0);
            done();
          });
        });
      });
    });

    it("memberships are unchanged if no membership key in a PUT", function(done) {
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
        .send({name: 'Joe Bloggs' })
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.result.memberships.length, 0);
          request.get('/api/v1.0.0-alpha/persons/joe-bloggs?embed=membership')
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
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [ { id: mem_id, person_id: "joe-bloggs", organization_id: 'another-org' } ]})
        .expect(200)
        .end(function(err) {
          assert.ifError(err);
          request.get('/api/v1.0.0-alpha/persons/joe-bloggs')
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
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [ { person_id: "james-bloggs", organization_id: 'example-org' } ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
        done();
      });
    });

    it("returns error if organization_id mismatched in PUT", function(done) {
      request.put('/api/v1.0.0-alpha/organizations/parliament')
      .send({name: 'Houses of Parliament', memberships: [ { person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "organization id (example-org) in membership and organization id (parliament) are mismatched");
        done();
      });
    });

    it("deletes memberships created if error in PUT", function(done) {
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [
        { person_id: "joe-bloggs", organization_id: 'example-org' },
        { person_id: "james-bloggs", organization_id: 'example-org' }
      ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
        request.get('/api/v1.0.0-alpha/persons/joe-bloggs?embed=membership')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.memberships.length, 0);
            done();
        });
      });
    });

    it("deletes memberships created if error in organization PUT", function(done) {
      request.put('/api/v1.0.0-alpha/organizations/parliament')
      .send({name: 'Houses of Parliament', memberships: [
        { person_id: "joe-bloggs", organization_id: 'parliament' },
        { person_id: "joe-bloggs", organization_id: 'example-org' }
      ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "organization id (example-org) in membership and organization id (parliament) are mismatched");
        request.get('/api/v1.0.0-alpha/organizations/parliament?embed=membership')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.memberships.length, 0);
            done();
        });
      });
    });

    it("restores existing memberships if there's an error in a PUT", function(done) {
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [{ person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [
          { id: mem_id, person_id: "joe-bloggs", organization_id: 'another-org' },
          { person_id: "james-bloggs", organization_id: 'example-org' }
        ]})
        .expect(400)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
          request.get('/api/v1.0.0-alpha/persons/joe-bloggs?embed=membership')
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
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [{ person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        var mem_id = res.body.result.memberships[0].id;
        request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
        .send({name: 'Joe Bloggs', memberships: [
          { person_id: "james-bloggs", organization_id: 'example-org' }
        ]})
        .expect(400)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
          request.get('/api/v1.0.0-alpha/persons/joe-bloggs?embed=membership')
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
      request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
      .send({name: 'Joe Bloggs', memberships: [{ person_id: "joe-bloggs", organization_id: 'example-org' } ]})
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships.length, 1);
        request.put('/api/v1.0.0-alpha/persons/joe-bloggs')
        .send({name: 'James Bloggs', memberships: [
          { person_id: "james-bloggs", organization_id: 'example-org' }
        ]})
        .expect(400)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.errors[0], "person id (james-bloggs) in membership and person id (joe-bloggs) are mismatched");
          request.get('/api/v1.0.0-alpha/persons/joe-bloggs')
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
      request.put('/api/v1.0.0-alpha/organizations/parliament')
      .send({name: 'The Houses of Parliament', memberships: [
        { person_id: "joe-bloggs", organization_id: 'parliament' },
        { person_id: "joe-bloggs", organization_id: 'example-org' }
      ]})
      .expect(400)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.errors[0], "organization id (example-org) in membership and organization id (parliament) are mismatched");
        request.get('/api/v1.0.0-alpha/organizations/parliament')
          .expect(200)
          .end(function(err, res) {
            assert.ifError(err);
            assert.equal(res.body.result.name, 'Houses of Parliament');
            done();
        });
      });
    });
  });

  describe("embedding memberships", function() {
    beforeEach(fixture.loadFixtures);

    it("embeds organizations when requested", function(done) {
      request.get('/api/v1.0.0-alpha/persons/fred-bloggs?embed=membership.organization')
      .expect(200)
      .end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.body.result.memberships[0].organization.name, 'House of Commons');
        done();
      });
    });
  });

});
