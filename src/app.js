"use strict";

var express = require('express');
var packageJSON = require("../package");
var collections = require('./collections');
var storageSelector = require('./middleware/storage-selector');
var authCheck = require('./middleware/auth-check');
var hiddenFields = require('./middleware/hidden-fields');
var validateBody = require('./middleware/validate-body');

module.exports = function (options) {
  options.storageSelector = options.storageSelector || 'fixedName';

  var app = express();

  // Expose globally fieldSpec option in the app config.
  app.set('fieldSpec', options.fieldSpec);

  // Clean up requests from tools like slumber that set the Content-Type but no body
  // eg https://github.com/dstufft/slumber/pull/32
  app.use( function (req, res, next) {
    if ( (req.method == "GET" || req.method == "DELETE" ) && req.headers['content-type'] === 'application/json' && !req.body ) {
      delete req.headers['content-type'];
    }
    next();
  });

  app.use(express.bodyParser());

  app.use(storageSelector(options));

  if (options.apiKey) {
    app.use(authCheck(options.apiKey));
  }

  app.get('/', function (req, res) {
    res.jsonp({
      info: {
        databaseName: req.storage.databaseName,
        version:      packageJSON.version,
      },
    });
  });


  /*
    Check that the collection is in the allowed list.
  */
  app.param('collection', function (req, res, next, collection) {
    // If the collection exists, carry on.
    if (collections[collection]) {
      return next();
    }

    res.status(404).jsonp({
      errors: ["collection '" + collection + "' not found"]
    });
  });

  app.get('/:collection', hiddenFields, function (req, res, next) {
    var collectionName = req.params.collection;
    req.storage.list(collectionName, function (err, docs) {
      if (err) { return next(err); }
      res.jsonp({ result: docs });
    });
  });

  app.get('/:collection/:id(*)', hiddenFields, function (req, res, next) {
    var collectionName = req.params.collection;
    var id             = req.params.id;

    req.storage.retrieve( collectionName, id, function (err, doc) {
      if (err) {
        next(err);
      } else if (doc) {
        res.jsonp({ result: doc });
      } else {
        res
          .status(404)
          .jsonp({
            errors: ["id '" + id + "' not found"]
          });
      }
    });
  });

  app.del('/:collection/:id(*)', function (req, res, next) {
    var collectionName = req.params.collection;
    var id             = req.params.id;

    req.storage.delete( collectionName, id, function (err) {
      if (err) {
        next(err);
      } else {
        res
          .status(204)
          .send('');
      }
    });
  });

  app.post('/:collection', validateBody, function (req, res, next) {

    var collectionName = req.params.collection;
    var body = req.body;

    req.storage.store(collectionName, body, function (err, doc) {
      if (err) { return next(err); }
      res
        .status(200)
        .jsonp({ result: doc });
    });

  });


  app.put('/:collection/:id(*)', validateBody, function (req, res, next) {

    var collectionName = req.params.collection;
    var id             = req.params.id;
    var body           = req.body;

    if (id !== body.id) {
      return res
        .status(400)
        .jsonp({
          errors: ["URL id and document id are different"]
        });

    }

    req.storage.store(collectionName, body, function (err, doc) {
      if (err) { return next(err); }
      res
        .status(200)
        .jsonp({ result: doc });
    });

  });


  /*
    Anything else we should 400 for as it is probably an unsupported method.
  */
  app.all('*', function (req, res) {
    res.status(405).jsonp({errors: ["unsupported method"] });
  });

  return app;
};
