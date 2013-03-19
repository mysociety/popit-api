"use strict";

var util        = require('util'),
    express     = require('express'),
    collections = require('./collections'),
    validate    = require('./validate'),
    _           = require('underscore');

var app = module.exports = express();

app.use(express.bodyParser());

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


function validateBody (req, res, next) {

  var collectionName = req.params.collection;
  var body = req.body;
  
  // If there is no id create one
  if (!body.id) {
    //FIXME - replace with mongo object id
    body.id = '123456789012345678901234';
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


app.post('/:collection', validateBody, function (req, res) {

  var collectionName = req.params.collection;
  var body = req.body;
  var id   = body.id;

  // FIXME - save the document here

  res
    .status(201)
    .location([collectionName, id].join('/'))
    .send();
});


