"use strict";

var util        = require('util'),
    assert      = require('assert'),
    express     = require('express'),
    collections = require('./collections'),
    validate    = require('./validate'),
    Storage     = require('../src/storage'),
    packageJSON = require("../package"),
    _           = require('underscore'),
    slugToDb    = require('./slug-to-database');

_.str = require('underscore.string');

var storageSelectors = {
  fixedName: {
    selector: function (req, res, next) {
      Storage.connectToDatabase(function (err) {
        if (!err) {
          var databaseName = req.app.get('popitApiOptions').databaseName;
          req.storage = new Storage(databaseName);
        }
        next(err);
      });
    },
    optionsCheck: function (options) {
      assert(options.databaseName, "Missing required option 'databaseName'");
    }
  },
  hostName: {
    selector: function (req, res, next) {
      Storage.connectToDatabase(function (err) {
        if (!err) {
          var host = req.host.replace(/\./g, '-');
          var databaseName = slugToDb('popit-api-' + _.str.slugify(host));
          req.storage = new Storage(databaseName);
        }
        next(err);
      });
    },
  }
};

module.exports = function (options) {
  
  // Apply defaults to the options here.
  _.defaults(options, {
    storageSelector: 'fixedName'
  });

  // check that we have all the options that we need
  var storageSelector = storageSelectors[options.storageSelector];
  assert(storageSelector, "Could not load storage selector '"+options.storageSelector+"'");
  if (storageSelector.optionsCheck) {
    storageSelector.optionsCheck(options);
  }

  var app = express();

  // store the options
  app.set('popitApiOptions', options);

  // Clean up requests from tools like slumber that set the Content-Type but no body
  // eg https://github.com/dstufft/slumber/pull/32
  app.use( function (req, res, next) {
    if ( (req.method == "GET" || req.method == "DELETE" ) && req.headers['content-type'] === 'application/json' && !req.body ) {
      delete req.headers['content-type'];
    }
    next();
  });


  app.use(express.bodyParser());

  app.use(storageSelector.selector);

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

    if (! collections[collection]) {
      res
        .status(404)
        .jsonp({
          errors: ["collection '" + collection + "' not found"]
        });
    } else {
      next();
    }
  });

  app.get('/:collection', function (req, res, next) {
    var collectionName = req.params.collection;
    req.storage.list(collectionName, function (err, docs) {
      if (err) { return next(err); }
      res.jsonp({ result: docs });
    });
  });

  app.get('/:collection/:id(*)', function (req, res, next) {
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


  function validateBody (req, res, next) {

    var collectionName = req.params.collection;
    var body = req.body;

    // If there is no id create one
    if (!body.id) {
      body.id = req.params.id || Storage.generateID();
    }

    validate(collectionName, body, function (err, errors) {

      if (err) {
        return next(err);
      } else if (errors.length === 0) {
        return next(null);
      } else {

        var details = _.map(errors, function (error) {
          return util.format(
            "Error '%s' with '%s'.",
            error.message,
            error.schemaUri
          );
        });

        res
          .status(400)
          .send({errors: details});
      }
    });
  }


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
