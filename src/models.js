"use strict";

var mongoose = require('mongoose');
var mongooseJsonSchema = require('./mongoose-json-schema');
var collections = require('./collections');
var Filter = require('./filter');

/**
 * Transform a document to a json doc.
 *
 * - options.fieldSpec The fields to show/hide
 */
function toJSON(doc, ret, options) {
  if (options.fields) {
    var filter = new Filter(options.fields);
    return filter.doc(ret);
  }
}

/**
 * Generate mongoose models from the collections module.
 */
for (var key in collections) {
  if (collections.hasOwnProperty(key)) {
    var spec = collections[key];
    var Schema = new mongoose.Schema({}, {collection: key, _id: false});
    Schema.plugin(mongooseJsonSchema, {jsonSchemaUrl: spec.popoloSchemaUrl});
    Schema.set('toJSON', {transform: toJSON});
    mongoose.model(spec.model, Schema);
  }
}
