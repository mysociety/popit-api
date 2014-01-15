"use strict";

var mongoose = require('mongoose');
var mongooseJsonSchema = require('./mongoose/json-schema');
var deduplicateSlug = require('./mongoose/deduplicate-slug');
var search = require('./mongoose/search');
var elasticsearch = require('./mongoose/elasticsearch');
var collections = require('./collections');
var filter = require('./filter');

/**
 * Transform a document to a json doc.
 *
 * - options.fieldSpec The fields to show/hide
 */
function filterFields(doc, ret, options) {
  return filter(ret, options.fields);
}

/**
 * Generate mongoose models from the collections module.
 *
 * This creates a new Schema for each popolo collection that has
 * been defined in collections.js. It then augments the schemas
 * with plugins which allow the schema to infer their fields from
 * a json schema, as well as search and slug deduplication.
 */
for (var key in collections) {
  if (collections.hasOwnProperty(key)) {
    createPopoloModel(collections[key]);
  }
}

function createPopoloModel(spec) {
  var Schema = new mongoose.Schema({_id: String}, {collection: key, strict: false});

  Schema.set('toJSON', {transform: filterFields});

  Schema.plugin(mongooseJsonSchema, {jsonSchemaUrl: spec.popoloSchemaUrl});
  Schema.plugin(deduplicateSlug);
  Schema.plugin(search);
  Schema.plugin(elasticsearch);

  // Collection specific plugins
  if (spec.plugins) {
    spec.plugins.forEach(function(plugin) {
      Schema.plugin.apply(Schema, plugin);
    });
  }

  mongoose.model(spec.model, Schema);
}

/**
 * Hidden fields mongoose schema
 */
var HiddenSchema = new mongoose.Schema({
  collectionName: String,
  doc: String,
  fields: Object
});

mongoose.model('Hidden', HiddenSchema);
