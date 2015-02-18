"use strict";

var importer = require('./importer');
var connection = require('./middleware/storage-selector').connection;

function importPopolo(job, done) {
  var dbName = job.data.dbName;
  var popoloJson = job.data.popoloJson;
  var db = connection(dbName);

  importer(db, popoloJson, function(err, stats) {
    if (err) {
      return next(err);
    }
    console.log("Successfully imported " + JSON.stringify(stats, null, 2));
    done({
      import: 'ok',
      stats: stats,
    });
  });
}

exports.importPopolo = importPopolo;
