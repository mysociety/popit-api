"use strict";

var importer = require('./importer');
var connection = require('./middleware/storage-selector').connection;

function importPopolo(job, done) {
  var instanceName = job.data.instance;
  var popoloJson = job.data.popoloJson;
  var databaseName = 'popitdev_' + instanceName;
  var db = connection(databaseName);

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
