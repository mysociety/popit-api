"use strict";

var importer = require('../importer');

function importPopolo(req, res, next) {
  importer(req.db, req.body, function(err, stats) {
    if (err) {
      return next(err);
    }
    res.withBody({
      import: 'ok',
      stats: stats,
    });
  });
}

function setup(app) {
  app.post('/import', importPopolo);
}

module.exports = setup;
