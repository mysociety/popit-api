"use strict";

var mongoose = require('mongoose');
var mongooseJsonSchema = require('./json-schema');
var jsonTransform = require('./json-transform').jsonTransformPlugin;
var search = require('./search');
var elasticsearch = require('./elasticsearch');
var embed = require('./embed');

var ImageSchema = new mongoose.Schema({
  created: Date,
  url: String,
  source: String,
  license: String,
  note: String,
  mime_type: String,
}, { strict: false });

function popoloPlugin(schema, options) {
  schema.plugin(mongooseJsonSchema, {jsonSchemaUrl: options.popoloSchemaUrl});
  schema.plugin(jsonTransform);
  schema.plugin(search);
  schema.plugin(elasticsearch);
  schema.plugin(embed);

  schema.statics.popoloSchemaUrl = function popoloSchemaUrl() {
    return options.popoloSchemaUrl;
  };

  schema.add({ images: [ImageSchema] });
}

module.exports = popoloPlugin;
