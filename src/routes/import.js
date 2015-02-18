"use strict";

var kue = require('kue');
var queue = kue.createQueue();

function importPopolo(req, res, next) {
  var job = queue.create('importPopolo', {
    title: 'import popolo',
    instance: req.popit.dbname(),
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
