"use strict";

var express = require('express');
var packageJSON = require("../package");
var collections = require('./collections');
var storageSelector = require('./middleware/storage-selector');
var authCheck = require('./middleware/auth-check');
var hiddenFields = require('./middleware/hidden-fields');
var validateBody = require('./middleware/validate-body');

// Make sure models are defined (they are accessed though req.collection).
require('./models');

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
    if (!collections[collection]) {
      return res.status(404).jsonp({
        errors: ["collection '" + collection + "' not found"]
      });
    }

    req.collection = req.db.model(collections[collection].model);

    next();
  });

  app.get('/search/:collection', hiddenFields, function(req, res, next) {
    var collectionName = req.param('collection');
    var query = req.param('q');
    if (!query) {
      return res.send(400, {error: ["Please provide a 'query' parameter"]});
    }
    req.storage.search(collectionName, query, function(err, docs) {
      if (err) {
        return next(err);
      }

      res.jsonp({ result: docs });
    });
  });

  app.get('/:collection', hiddenFields, function (req, res, next) {
    req.collection.find(function (err, docs) {
      if (err) {
        return next(err);
      }
      res.jsonp({ result: docs });
    });
  });

  app.get('/:collection/:id(*)', hiddenFields, function (req, res, next) {
    var id = req.params.id;

    req.collection.findOne({_id: id}, function (err, doc) {
      if (err) {
        return next(err);
      }

      if (doc) {
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
    var id             = req.params.id;

    req.collection.remove({_id: id}, function (err) {
      if (err) {
        return next(err);
      }
      res.send(204);
    });
  });

  app.post('/:collection', validateBody, function (req, res, next) {
    req.collection.create(req.body, function (err, doc) {
      if (err) {
        return next(err);
      }
      res.jsonp({ result: doc });
    });

  });


  app.put('/:collection/:id(*)', validateBody, function (req, res, next) {

    var id             = req.params.id;
    var body           = req.body;

    if (id !== body.id) {
      return res
        .status(400)
        .jsonp({
          errors: ["URL id and document id are different"]
        });

    }

    delete body._id;

    req.collection.findByIdAndUpdate(id, body, {upsert: true}, function (err, doc) {
      if (err) {
        return next(err);
      }
      res.jsonp({ result: doc });
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
