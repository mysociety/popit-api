"use strict";

var express = require('express');
var packageJSON = require("../package");
var collections = require('./collections');
var storageSelector = require('./middleware/storage-selector');
var authCheck = require('./middleware/auth-check');
var hiddenFields = require('./middleware/hidden-fields');
var validateBody = require('./middleware/validate-body');
var apiLinks = require('./middleware/api-links');
var reIndex = require('./reindex');
var paginate = require('./paginate');
var withBody = require('./middleware/with-body');

// Make sure models are defined (they are accessed through req.collection).
require('./models');

module.exports = popitApiApp;

// Expose the reIndex function so popit UI can use it.
popitApiApp.reIndex = reIndex;

function popitApiApp(options) {
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

  app.use(withBody);

  app.get('/', function (req, res) {
    res.jsonp({
      info: {
        databaseName: req.db.model('Hidden').db.name,
        version:      packageJSON.version,
      },
    });
  });


  /**
   * Check that the collection is in the allowed list, if it is then expose
   * it as req.collection.
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

  /**
   * Handle hidden fields on collections.
   */
  app.param('collection', hiddenFields);
  app.param('collection', apiLinks(options));


  app.get('/search/:collection', function(req, res, next) {
    req.collection.search(req.query, function(err, result) {
      if (err) {
        return next(err);
      }

      var docs = result.hits.hits.map(function(doc) {
        return new req.collection(doc._source);
      });

      res.jsonp({ total: result.hits.total, result: docs });
    });
  });

  app.get('/:collection', function (req, res, next) {
    var skipLimit = paginate(req.query);
    req.collection.find({}, null, skipLimit, function (err, docs) {
      if (err) {
        return next(err);
      }
      req.collection.count(function(err, count) {
        res.jsonp({
          total: count,
          page: skipLimit.page,
          per_page: skipLimit.limit,
          result: docs
        });
      });
    });
  });

  app.get('/:collection/:id(*)', function (req, res, next) {
    var id = req.params.id;

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.jsonp(404, {errors: ["id '" + id + "' not found"]});
      }

      res.withBody(doc);
    });
  });

  app.del('/:collection/:id(*)', function (req, res, next) {
    var id = req.params.id;

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.send(204);
      }
      doc.remove(function(err) {
        if (err) {
          return next(err);
        }
        res.send(204);
      });
    });
  });

  app.post('/:collection', validateBody, function (req, res, next) {
    req.collection.create(req.body, function (err, doc) {
      if (err) {
        return next(err);
      }
      res.withBody(doc);
    });

  });


  app.put('/:collection/:id(*)', validateBody, function (req, res, next) {

    var id = req.params.id;
    var body = req.body;

    if (id !== body.id) {
      return res
        .status(400)
        .jsonp({
          errors: ["URL id and document id are different"]
        });

    }

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        doc = new req.collection();
      }
      delete body.__v;
      doc.set(body);
      doc.save(function(err) {
        if (err) {
          return next(err);
        }
        res.withBody(doc);
      });
    });

  });


  /*
    Anything else we should 400 for as it is probably an unsupported method.
  */
  app.all('*', function (req, res) {
    res.status(405).jsonp({errors: ["unsupported method"] });
  });

  return app;
}
