"use strict";

var util = require('util');
var JSV = require('JSV').JSV;
var schemas = require('../schemas');

var env = JSV.createEnvironment();

/**
 * Mongoose plugin which infers fields and validations from a json schema.
 *
 * Example
 *
 *     var PersonSchema = new mongoose.Schema();
 *     PersonSchema.plugin(jsonSchema, {jsonSchema: require('../schemas/popolo/person.json')});
 *
 * @param {mongoose.Schema} schema The schema to augment
 * @param {object} options The options to configure the plugin
 */
function mongooseJsonSchema(schema, options) {
  var fields = {};
  var jsonSchemaUrl = options.jsonSchemaUrl;
  var jsonSchema = schemas[jsonSchemaUrl];

  for (var name in jsonSchema.properties) {
    if (jsonSchema.properties.hasOwnProperty(name)) {
      var field = jsonSchema.properties[name];

      // TODO Handle document references in a smart way
      if (field.$ref) {
        continue;
      }

      fields[name] = {
        type: typeof field.type === 'string' ? field.type : field.type[0],
      };

      if (field.required) {
        fields[name].required = true;
      }
    }
  }

  schema.add(fields);

  schema.pre('save', function(next) {
    this.slug = this.id;
    delete this.id;
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

  schema.post('init', function(doc) {
    doc.id = doc.slug;
  });
}

module.exports = mongooseJsonSchema;
