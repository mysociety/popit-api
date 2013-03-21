"use strict";

var util        = require('util'),
    express     = require('express'),
    collections = require('./collections'),
    validate    = require('./validate'),
    config      = require('../src/config'),
    Storage     = require('../src/storage'),
    _           = require('underscore');

module.exports = function () {
  
  var app = express();

  app.use(express.bodyParser());

  function determineStorage (req, res, next) {
    Storage.connectToDatabase(function (err) {
      if (!err) {
        req.storage = new Storage(config['popit-api'].database.name);
      }
      next(err);
    });
  }

  app.use(determineStorage);

  app.get('/', function (req, res) {
    res.jsonp({foo: 'FIXME'});
  });


  /*
    Check that the collection is in the allowed list.
  */
  app.param('collection', function (req, res, next, collection) {

    if (! collections[collection]) {
      res
        .status(404)
        .jsonp({
          error: "collection '" + collection + "' not found"
        });
    } else {
      next();
    }
  });

  app.get('/:collection', function (req, res, next) {
    var collectionName = req.params.collection;
    req.storage.list(collectionName, function (err, docs) {
      if (err) { return next(err); }
      res.jsonp(docs);
    });
  });

  app.get('/:collection/:id', function (req, res, next) {
    var collectionName = req.params.collection;
    var id             = req.params.id;

    req.storage.retrieve( collectionName, id, function (err, doc) {
      if (err) {
        next(err);
      } else if (doc) {
        res.jsonp(doc);
      } else {
        res
          .status(404)
          .jsonp({
            error: "id '" + id + "' not found"
          });
      }
    });
  });

  app.del('/:collection/:id', function (req, res, next) {
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

    req.storage.store(collectionName, body, function (err) {
      if (err) { return next(err); }
      res
        .status(201)
        .location([collectionName, body.id].join('/'))
        .send();
    });

  });


  app.put('/:collection/:id', validateBody, function (req, res, next) {

    var collectionName = req.params.collection;
    var id             = req.params.id;
    var body           = req.body;

    if (id !== body.id) {
      return res
        .status(400)
        .jsonp({
          error: "URL id and document id are different"
        });

    }

    req.storage.store(collectionName, body, function (err) {
      if (err) { return next(err); }
      res
        .status(201)
        .location([collectionName, body.id].join('/'))
        .send();
    });

  });


  /*
    Anything else we should 400 for as it is probably an unsupported method.
  */
  app.all('*', function (req, res) {
    res.status(400).jsonp({error: "unsupported method"});
  });

  return app;
};
