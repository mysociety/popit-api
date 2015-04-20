"use strict";

var zlib = require('zlib');
var exporter = require('../exporter');

module.exports = function(app) {
  // Export all languages - can potentially produce invalid popolo
  app.get('/export.json', function(req, res, next) {
    exporter(req.db, req, function(err, exportObject) {
      if (err) {
        return next(err);
      }
      req.returnAllTranslations = true;
      res.send(exportObject);
    });
  });

  app.get('/export.json.gz', function(req, res, next) {
    exporter(req.db, req, function(err, exportObject) {
      if (err) {
        return next(err);
      }
      var filename;
      if (req.options.instanceName) {
        filename = req.options.instanceName + '-popolo-export.json.gz';
      } else {
        filename = 'popolo-export.json.gz';
      }
      res.attachment(filename);
      var buf = new Buffer(JSON.stringify(exportObject), 'utf8');
      zlib.gzip(buf, function(err, result) {
        if (err) {
          return next(err);
        }
        res.end(result);
      });
    });
  });

  // Export an individual language, this should be valid popolo
  app.get('/export-:language.json', function(req, res, next) {
    exporter(req.db, req, function(err, exportObject) {
      if (err) {
        return next(err);
      }
      req.langs = [req.params.language];
      res.send(exportObject);
    });
  });

  // Export an individual language, this should be valid popolo
  app.get('/export-:language.json.gz', function(req, res, next) {
    exporter(req.db, req, function(err, exportObject) {
      if (err) {
        return next(err);
      }
      req.langs = [req.params.language];
      var filename;
      if (req.options.instanceName) {
        filename = req.options.instanceName + '-popolo-export-' + req.params.language + '.json.gz';
      } else {
        filename = 'popolo-export-' + req.params.language + '.json.gz';
      }
      res.attachment(filename);
      var buf = new Buffer(JSON.stringify(exportObject), 'utf8');
      zlib.gzip(buf, function(err, result) {
        if (err) {
          return next(err);
        }
        res.end(result);
      });
    });
  });
};
