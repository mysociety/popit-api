"use strict";

var util        = require('util'),
    express     = require('express'),
    collections = require('./collections'),
    validate    = require('./validate'),
    config      = require('../src/config'),
    Storage     = require('../src/storage'),
    _           = require('underscore');

var app = module.exports = express();

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
  res.jsonp({foo: 'bar'});
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

app.get('/:collection', function (req, res) {
  res.send("FIXME");
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


function validateBody (req, res, next) {

  var collectionName = req.params.collection;
  var body = req.body;
  
  // If there is no id create one
  if (!body.id) {
    body.id = Storage.generateID();
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

