"use strict";

var _             = require('underscore'),
    schemas       = require('../schemas'),
    collections   = require('./collections'),
    assert        = require('assert');


var JSV           = require("JSV").JSV;



var env = JSV.createEnvironment();

// Add all the needed schemas
_.each(schemas, function (schema) {
  if ( /popolo/.test(schema.id) ){
    env.createSchema(schema, true, schema.id);
  }
});


module.exports = function (name, data, callback) {
  
  var collection, schemaUrl, schema;
  
  if (/https?:\/\//.test(name)) {
    schemaUrl = name;
  } else {
    collection = collections[name];
    assert(collection, "Could not load collection for '" + name + "'");
    schemaUrl = collection.popoloSchemaUrl;
    assert(schemaUrl, "Could not get url from collection '" + name + "'");
  }

  schema = schemas[schemaUrl];
  assert(schema, "Could not get schema for '" + schemaUrl + "'");

  var report = env.validate(data, schema);

  callback(null, report.errors );

};

