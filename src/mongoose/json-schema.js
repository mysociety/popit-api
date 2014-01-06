"use strict";

var schemas = require('../../schemas');

module.exports = mongooseJsonSchema;

/**
 * Mongoose plugin which infers fields and validations from a json schema.
 *
 * Example
 *
 *     var PersonSchema = new mongoose.Schema();
 *     PersonSchema.plugin(jsonSchema, {jsonSchemaUrl: 'http://popoloproject.com/schemas/person.json#'});
 *
 * @param {mongoose.Schema} schema The schema to augment
 * @param {object} options The options to configure the plugin
 */
function mongooseJsonSchema(schema, options) {
  var jsonSchemaUrl = options.jsonSchemaUrl;
  var jsonSchema = schemas[jsonSchemaUrl];

  if (!jsonSchema || !jsonSchema.properties) {
    throw new Error("Invalid jsonSchemaUrl: " + jsonSchemaUrl);
  }

  schema.add(jsonSchemaFields(jsonSchema));

  // TODO: Add tests for this before re-enabling.
  // Validation at this level breaks the popit tests, commenting out
  // for now until there is better test coverage for this.
  /*
  var util = require('util');
  var JSV = require('JSV').JSV;
  var env = JSV.createEnvironment();
  schema.pre('save', function(next) {
    var report = env.validate(this, jsonSchema);

    if (report.errors.length === 0) {
      return next();
    }

    var err = new Error(util.format(
      "Error '%s' with '%s'.",
      report.errors[0].message,
      report.errors[0].schemaUri
    ));
    next(err);
  });
  */
}

function jsonSchemaFields(jsonSchema) {
  var fields = {};

  for (var name in jsonSchema.properties) {
    if (jsonSchema.properties.hasOwnProperty(name)) {
      var field = jsonSchema.properties[name];

      // TODO Handle document references in a smart way
      if (field.$ref) {
        continue;
      }

      if (field.type === 'array') {
        fields[name] = [jsonSchemaFields(field.items)];
      } else {
        fields[name] = {
          type: typeof field.type === 'string' ? field.type : field.type[0],
        };
      }

      if (field.required) {
        fields[name].required = true;
      }
    }
  }

  return fields;
}
