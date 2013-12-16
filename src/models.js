"use strict";

var mongoose = require('mongoose');
var mongooseJsonSchema = require('./mongoose-json-schema');
var collections = require('./collections');

function toJSON() {
  /* jshint validthis: true */
  var doc = this.toObject();
  doc.id = doc._id;
  delete doc._id;
  return doc;
}

/**
 * Generate mongoose models from the collections module.
 */
for (var key in collections) {
  if (collections.hasOwnProperty(key)) {
    var spec = collections[key];
    var Schema = new mongoose.Schema({}, {collection: key, _id: false});
    Schema.plugin(mongooseJsonSchema, {jsonSchemaUrl: spec.popoloSchemaUrl});
    Schema.methods.toJSON = toJSON;
    mongoose.model(spec.model, Schema);
  }
}
