"use strict";

var _           = require('underscore'),
    // assert      = require('assert'),
    collections = require('../src/collections');
    // schemas     = require('../schemas');

describe("Collections", function () {
  
  describe("should have related schemas for", function () {
    
    _.each( collections, function (config, name) {
      it(name, function () {
        // assert(schemas[config.popoloSchemaUrl]);
      });
    });
    
  });
  
});
