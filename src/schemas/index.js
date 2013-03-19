"use strict";

var _      = require('underscore'),
    assert = require('assert');

var draftSchemas = {
  "draft-03-schema":            require('./drafts/03-schema.json'),
  "draft-04-schema":            require('./drafts/04-schema.json'),
};

var popoloSchemas = {
  "address":                    require('./popolo/address.json'),
  "membership":                 require('./popolo/membership.json'),
  "organization":               require('./popolo/organization.json'),
  "other_name":                 require('./popolo/other_name.json'),
  "person":                     require('./popolo/person.json'),
  "post":                       require('./popolo/post.json'),
};

var allSchemas = _.extend({}, draftSchemas, popoloSchemas);

var urlSchemas = {};
_.each( allSchemas, function (schema) {
  urlSchemas[schema.id] = schema;
});





module.exports = urlSchemas;
