"use strict";

var mongooseJsonSchema = require('./json-schema');
var jsonTransform = require('./json-transform');
var deduplicateSlug = require('./deduplicate-slug');
var search = require('./search');
var elasticsearch = require('./elasticsearch');

function popoloPlugin(schema, options) {
  schema.plugin(mongooseJsonSchema, {jsonSchemaUrl: options.popoloSchemaUrl});
  schema.plugin(jsonTransform);
  schema.plugin(deduplicateSlug);
  schema.plugin(search);
  schema.plugin(elasticsearch);
}

module.exports = popoloPlugin;
