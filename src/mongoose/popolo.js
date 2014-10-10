"use strict";

var mongooseJsonSchema = require('./json-schema');
var jsonTransform = require('./json-transform');
var search = require('./search');
var elasticsearch = require('./elasticsearch');
var embed = require('./embed');

function popoloPlugin(schema, options) {
  schema.plugin(mongooseJsonSchema, {jsonSchemaUrl: options.popoloSchemaUrl});
  schema.plugin(jsonTransform);
  schema.plugin(search);
  schema.plugin(elasticsearch);
  schema.plugin(embed);

  schema.statics.popoloSchemaUrl = function popoloSchemaUrl() {
    return options.popoloSchemaUrl;
  };
}

module.exports = popoloPlugin;
