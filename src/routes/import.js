"use strict";

var kue = require('kue');

function importPopolo(req, res, next) {
  var queue = kue.createQueue({
    prefix: req.options.queuePrefix,
  });
  var job = queue.create('importPopolo', {
    title: 'import popolo',
    dbName: req.db.name,
    popoloJson: req.body,
  }).save(function(err) {
    if (err) {
      return next(err);
    }
    res.withBody({
      job_id: job.id,
    });
  });
}

function setup(app) {
  app.post('/import', importPopolo);
}

module.exports = setup;
