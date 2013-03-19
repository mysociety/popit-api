"use strict";

var _             = require('underscore'),
    schemas       = require('./schemas'),
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

// env.createSchema(schemas['http://popoloproject.com/schemas/person.json#'], null, 'http://popoloproject.com/schemas/person.json#');
// env.createSchema(schemas['http://popoloproject.com/schemas/other_name#'], null, 'http://popoloproject.com/schemas/other_name.json#');



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

  // var schema = schemas[schemaUrl];
  var report = env.validate(data, schema);

  // console.log( report.errors);
  
  callback(null, report.errors );

};



// I looked at using JaySchema but it just did not seem to be able to do the basic validation :(
// I'm probably getting something wrong.
//
// var JaySchema     = require('jayschema');
// 
// var loader = function loader(ref, callback) {
// 
//   // Add the trailing hash if needed
//   if (! /#/.test(ref)) {
//     ref += "#";
//   }
// 
//   var schema = schemas[ref];
// 
//   if (schema) {
//     callback( null, schema );
//   } else {
//     callback("Could not load schema for '" + ref  + "'");
//   }
// };
// 
// 
// 
// module.exports = function (collectionName, data, callback) {
//   
//   var js = new JaySchema(loader);
// 
//   var collection = collections[collectionName];
//   assert(collection, "Could not load collection for '" + collectionName + "'");
//   var schemaUrl = collection.popoloSchemaUrl;
//   assert(schemaUrl, "Could not get url from collection'" + collectionName + "'");
// 
//   js.validate(
//     data,
//     schemaUrl,
//     function (errors) {
//       callback(null, errors || [] );
//     }
//   );
// 
// };
