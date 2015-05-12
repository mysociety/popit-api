"use strict";

var master = require('../master');

var Account = master.model('Account');

function setup(app) {
  app.post('/accounts', function createAccount(req, res, next) {
    Account.create(req.body, function(err, account) {
      if (err) {
        return next(err);
      }
      res.withBody(account);
    });
  });
}

module.exports = setup;
