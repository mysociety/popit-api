"use strict";

var assert = require('assert');
var master = require('../src/master');
var Instance = master.model('Instance');
var Account = master.model('Account');
var Permission = master.model('Permission');

describe("Permission model", function() {
  var permission;
  var instance;
  var account;

  beforeEach(function(done) {
    Permission.remove(done);
  });

  beforeEach(function(done) {
    Account.remove(done);
  });

  beforeEach(function(done) {
    Instance.remove(done);
  });

  beforeEach(function(done) {
    account = new Account({
      name: 'Test',
      email: 'test@example.org',
    });
    account.save(done);
  });

  beforeEach(function(done) {
    instance = new Instance({
      slug: 'test',
      email: 'test@example.org',
    });
    instance.save(done);
  });

  beforeEach(function() {
    permission = new Permission({account: account, instance: instance, role: 'editor'});
  });

  it("requires an account", function(done) {
    permission.account = null;
    permission.save(function(err) {
      assert.equal(err.errors.account.message, 'Permissions require an account');
      done();
    });
  });

  it("requires an instance", function(done) {
    permission.instance = null;
    permission.save(function(err) {
      assert.equal(err.errors.instance.message, 'Permissions require an instance');
      done();
    });
  });

  it("requires a role", function(done) {
    permission.role = null;
    permission.save(function(err) {
      assert.equal(err.errors.role.message, 'Permissions require a role');
      done();
    });
  });

  it("must have a role of owner or editor", function(done) {
    permission.role = 'flargle';
    permission.save(function(err) {
      assert.equal(err.errors.role.message, 'Permission role must be either owner or editor');
      done();
    });
  });

  it("saves correctly when attributes are correct", function(done) {
    permission.save(function(err, permission) {
      assert.ifError(err);
      assert(permission);
      done();
    });
  });

});
