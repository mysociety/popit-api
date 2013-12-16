"use strict";

var util = require('util');
var validate = require('../validate');
var Storage = require('../storage');

function validateBody (req, res, next) {

  var collectionName = req.params.collection;
  var body = req.body;

  // If there is no id create one
  if (!body.id) {
    body.id = req.params.id || Storage.generateID();
  }

  body._id = body.id;

  validate(collectionName, body, function (err, errors) {

    if (err) {
      return next(err);
    } else if (errors.length === 0) {
      return next(null);
    } else {

      var details = errors.map(function (error) {
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

module.exports = validateBody;
