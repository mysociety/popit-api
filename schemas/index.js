"use strict";

var _      = require('underscore'),
    assert = require('assert');

var draftSchemas = {
  "draft-03-schema":            require('./drafts/03-schema.json'),
  "draft-04-schema":            require('./drafts/04-schema.json'),
};

var popoloSchemas = {
  "contact_detail":             require('./popolo/contact_detail.json'),
  "identifier":                 require('./popolo/identifier.json'),
  "link":                       require('./popolo/link.json'),
  "membership":                 require('./popolo/membership.json'),
  "organization":               require('./popolo/organization.json'),
  "other_name":                 require('./popolo/other_name.json'),
  "person":                     require('./popolo/person.json'),
  "post":                       require('./popolo/post.json'),
};

var mySocietySchemas = {
  "membership":                 require('./popolo+mysociety/membership.json'),
  "post":                       require('./popolo+mysociety/post.json'),
};

// Schemas for which it is okay to substitute in the workaround below
var leafSchemas = [
  "http://popoloproject.com/schemas/contact_detail.json#",
  "http://popoloproject.com/schemas/identifier.json#",
  "http://popoloproject.com/schemas/link.json#",
  "http://popoloproject.com/schemas/other_name.json#",
];

var allSchemas = _.extend({}, draftSchemas, popoloSchemas, mySocietySchemas);

var urlSchemas = {};
_.each( allSchemas, function (schema) {
  urlSchemas[schema.id] = schema;
});



// go through all the url schemas and make sure that any $refs are replaced with
// the schema they refer to. This is a workaround for
// https://github.com/garycourt/JSV/issues/68
_.each(popoloSchemas, swapOutDollarRefs);
_.each(mySocietySchemas, swapOutDollarRefs);

function swapOutDollarRefs (data) {
  
  // If we are not a dict or array don't continue
  if (!_.isObject(data)) {
    return;
  }

  // look at all the contents of data to see if it needs swapping
  _.each(data, function (val, key) {
    // Is there a $ref to replace?
    if (_.isObject(val)) {
      if (_.has(val, '$ref')) {
        var $ref = val.$ref;
        if (leafSchemas.indexOf($ref) != -1) {
          var refSchema = urlSchemas[$ref];
          assert(refSchema, "Could not find schema for '" + $ref + "'");

          // swap out the contents
          data[key] = refSchema;
        }
      }
    }
  });


  // recurse down
  _.each(data, swapOutDollarRefs);
    
}


module.exports = urlSchemas;
