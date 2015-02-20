"use strict";

var kue = require('kue');

function setup(app, options) {
  function importPopolo(req, res, next) {
    var queue = kue.createQueue({
      prefix: req.options.queuePrefix || 'popit-api-',
    });
    var job = queue.create('importPopolo', {
      title: 'import popolo',
      dbName: req.db.name,
      popoloJson: req.body,
    });

    // Create a new import
    var Import = req.db.model('Import');
    var im = new Import();
    im.save(function(err, im) {
      if (err) {
        return next(err);
      }
      job.data.importId = im.id;
      job.save(function(err) {
        if (err) {
          return next(err);
        }
        var baseUrl = options.apiBaseUrl ? options.apiBaseUrl : '';
        res.withBody({
          import_id: im.id,
          url: baseUrl + '/imports/' + im.id,
        });
      });
    });
  }

  function getImport(req, res, next) {
    var Import = req.db.model('Import');
    var id = req.param('id');
    Import.findById(id, function(err, im) {
      if (err) {
        return next(err);
      }
      if (!im) {
        return res.jsonp(404, {errors: ["id '" + id + "' not found"]});
      }
      res.withBody({
        status: im.status,
        counts: im.counts,
      });
    });
  }

  app.get('/imports/user', function(req, res) {
    if (req.user) {
      res.send(200);
    } else {
      res.send(401);
    }
  });

  app.post('/imports', importPopolo);
  app.get('/imports/:id', getImport);
}

module.exports = setup;
