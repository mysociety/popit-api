"use strict";

var assert = require('assert');
var master = require('../src/master');
var Account = master.model('Account');

describe("Account model", function() {
  var account;

  beforeEach(function(done) {
    Account.remove(done);
  });

  beforeEach(function() {
    account = new Account({name: 'Bob', email: 'bob@example.org'});
  });

  describe("email", function() {

    it("is required", function(done) {
      account.email = null;
      account.save(function(err) {
        assert.equal(err.errors.email.message, 'Email is required.');
        done();
      });
    });

    it("must be valid", function(done) {
      account.email = 'notanemail';
      account.save(function(err) {
        assert.equal(err.errors.email.message, '`notanemail` is not a valid email address.');
        done();
      });
    });

    it("must be unique", function(done) {
      account.save(function(err) {
        assert.ifError(err);
        var newAccount = new Account({name: 'Bob', email: 'bob@example.org'});
        newAccount.save(function(err) {
          assert.equal(err.errors.email.message, 'There is already an account for bob@example.org');
          done();
        });
      });
    });

    it("gets trimmed", function(done) {
      account.email = ' bob@example.org ';
      account.save(function(err) {
        assert.ifError(err);
        assert.equal(account.email, 'bob@example.org');
        done();
      });
    });

    it("gets converted to lowercase", function(done) {
      account.email = 'BOB@EXAMPLE.ORG';
      account.save(function(err) {
        assert.ifError(err);
        assert.equal(account.email, 'bob@example.org');
        done();
      });
    });

  });

  describe("name", function() {

    it("is required", function(done) {
      account.name = null;
      account.save(function(err) {
        assert.equal(err.errors.name.message, 'Name is required.');
        done();
      });
    });

  });

  describe("setResetPasswordToken", function() {
    beforeEach(function(done) {
      account.save(done);
    });

    it("sets a token and an expiry date", function(done) {
      account.setResetPasswordToken(function(err, token) {
        assert.ifError(err);
        assert.equal(token, account.resetPasswordToken);
        assert.equal(token.length, 40);
        assert(account.resetPasswordExpires);
        done();
      });
    });

  });

  describe("setAPIKey", function() {

    beforeEach(function(done) {
      account.save(done);
    });

    it("generates a random API key", function(done) {
      assert(!account.apikey);
      account.setAPIKey(function(err, key) {
        assert.ifError(err);
        assert.equal(key, account.apikey);
        assert.equal(key.length, 40);
        done();
      });
    });

    it("generates a different API key each time", function(done) {
      account.setAPIKey(function(err, key) {
        assert.ifError(err);
        account.setAPIKey(function(err, newKey) {
          assert.ifError(err);
          assert(key != newKey);
          done();
        });
      });
    });

  });

  describe("removeAPIKey", function() {

    beforeEach(function(done) {
      account.save(done);
    });

    it("removes the API key", function(done) {
      account.setAPIKey(function(err) {
        assert.ifError(err);
        assert(account.apikey);
        account.removeAPIKey(function(err) {
          assert.ifError(err);
          assert(!account.apikey);
          done();
        });
      });
    });

  });

});
