"use strict";

var //_             = require('underscore'),
    schemas       = require('./schemas'),
    collections   = require('./collections'),
    assert        = require('assert');


var JSV           = require("jsv").JSV;



module.exports = function (collectionName, data, callback) {
  
  var env = JSV.createEnvironment();

  var collection = collections[collectionName];
  assert(collection, "Could not load collection for '" + collectionName + "'");
  var schemaUrl = collection.popoloSchemaUrl;
  assert(schemaUrl, "Could not get url from collection'" + collectionName + "'");

  var schema = schemas[schemaUrl];
  var report = env.validate(data, schema);

  if (report.errors.length === 0) {
      //JSON is valid against the schema
  }
  
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
