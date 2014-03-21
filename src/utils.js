"use strict";

var collections = require('./collections');

function eachSchema(mongoose, callback) {
  for (var key in collections) {
    var schema = mongoose.model(collections[key].model).schema;
    callback(schema);
  }
}

exports.eachSchema = eachSchema;
