"use strict";

var importer = require('./importer');
var connection = require('./middleware/storage-selector').connection;

function importPopolo(job, done) {
  var dbName = job.data.dbName;
  var popoloJson = job.data.popoloJson;
  var db = connection(dbName);
  var Import = db.model('Import');

  Import.findById(job.data.importId, function(err, im) {
    if (err) {
      return done(err);
    }
    if (!im) {
      return done(new Error("Couldn't find import ", job.data.importId));
    }
    importer(db, popoloJson, function(err, stats) {
      if (err) {
        return done(err);
      }
      console.log("Successfully imported " + JSON.stringify(stats, null, 2));
      im.status = 'complete';
      im.counts = stats;
      im.save(done);
    });
  });
}

exports.importPopolo = importPopolo;
