"use strict";

var _ = require('underscore');

var shortNamedSchemas = {
  "draft-04-schema":            require('./draft-04/schema.json'),
  "address":                    require('./popolo/address.json'),
  "membership":                 require('./popolo/membership.json'),
  "organization":               require('./popolo/organization.json'),
  "other_name":                 require('./popolo/other_name.json'),
  "person":                     require('./popolo/person.json'),
  "post":                       require('./popolo/post.json'),
};

var urlSchemas = {};
_.values( shortNamedSchemas, function (schema) {
  urlSchemas[schema.id] = schema;
})


module.exports = _.extend(
  {},
  shortNamedSchemas,
  urlSchemas
);
