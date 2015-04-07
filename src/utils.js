"use strict";

var models = require('./models');

function eachSchema(callback) {
  for (var key in models) {
    callback(models[key].schema);
  }
}

exports.eachSchema = eachSchema;
