"use strict";

var util = require('util');
var JSV = require('JSV').JSV;
var schemas = require('../schemas');
var _ = require('underscore');
var unorm = require('unorm');
var DoubleMetaphone = require('doublemetaphone');

var dm = new DoubleMetaphone();

var env = JSV.createEnvironment();

module.exports = mongooseJsonSchema;

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
  var jsonSchemaUrl = options.jsonSchemaUrl;
  var jsonSchema = schemas[jsonSchemaUrl];

  var fields = {};

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
    var report = env.validate(this, jsonSchema);

    if (report.errors.length === 0) {
      if (this.name) {
        indexNameWords(this, this.name);
      }
      return deduplicateSlug(this, this.collection, next);
    }

    var err = new Error(util.format(
      "Error '%s' with '%s'.",
      report.errors[0].message,
      report.errors[0].schemaUri
    ));
    next(err);
  });
}

function indexNameWords(doc, v) {
  // Set normalized array of words for searching
  var words = _.union(
    v.split(/\s+/).map( function(s) {
      return s.toLowerCase();
    }),
    v.split(/\s+/).map( function(s) {
      return unorm.nfkd(s.toLowerCase()).replace(/[\u0300-\u036F]/g, '');
    })
  );
  doc._internal = doc._internal || {};
  doc._internal.name_words = words;
  // Set the double metaphone entries. Currently just stores both primary and secondary without saying which is which
  var dm_words = [];
  words.forEach(function(w) {
    dm_words.push.apply(dm_words, _.values(dm.doubleMetaphone(w)) );
  });
  // Also include the words to make the searching easier. Perhaps this can be just one array?
  doc._internal.name_dm = dm_words.concat(words);
}

function deduplicateSlug(doc, collection, cb) {

  if (!doc.slug) {
    return cb(null);
  }

  // find other entries in the database that have the same slug
  collection.findOne({ slug: doc.slug, _id: { $ne: doc.id } }, function(err, conflict) {
    if (err) {
      return cb(err);
    }

    // if nothing found then no need to change slug
    if (!conflict) {
      return cb(null);
    }

    // we have a conflict, increment the slug
    var matches = conflict.slug.match(/^(.*)\-(\d+)$/);

    if ( !matches ) {
      doc.slug = doc.slug + '-1';
    } else {
      var base_slug = matches[1];
      var counter   = parseInt( matches[2], 10 ) + 1;
      doc.slug     = base_slug + '-' + counter;
    }

    return deduplicateSlug(doc, collection, cb); // recurse
  });
}
