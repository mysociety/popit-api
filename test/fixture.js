"use strict";

var powMongoDBFixtures = require("pow-mongodb-fixtures"),
    defaults           = require("./defaults"),
    _                  = require('underscore');


// data added at bottom of this file
var collections = {};

var fixture = powMongoDBFixtures.connect(defaults.databaseName);



module.exports = {
  loadFixtures: function (cb) {
    fixture.clearAllAndLoad(collections, cb);
  },
  clearDatabase: function (cb) {
    fixture.clear(cb);
  }
};


collections.persons = {
  fredBloggs: {
    id: "fred-bloggs",
    name: "Fred Bloggs",
  },
  joeBloggs: {
    id: "joe-bloggs",
    name: "Joe Bloggs",
  },
};


// go through all the entries and add the _id field
_.each( collections, function(collection) {
  _.each( collection, function (doc) {
    doc._id = doc.id;
  });
});

