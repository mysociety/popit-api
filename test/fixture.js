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
    email: 'fbloggs@example.org',
  },
  joeBloggs: {
    id: "joe-bloggs",
    name: "Joe Bloggs",
    email: "jbloggs@example.org",
  },
};

collections.organizations = {
  parliament: {
    id: "parliament",
    name: "Houses of Parliament",
  },
  commons: {
    id: "commons",
    name: "House of Commons",
    parent_id: "parliament",
  },
};

collections.posts = {
  annapolis: {
    id: "annapolis",
    organization_id: "commons",
    label: "MP for Annapolis",
    role: "Member of Parliament",
    area: { name: "Annapolis", id: "http://mapit.example.org/area/1" },
  },
  avalon: {
    id: "avalon",
    organization_id: "commons",
    label: "MP for Avalon",
    role: "Member of Parliament",
    area: { name: "Avalon", id: "http://mapit.example.org/area/2" },
  },
};

collections.memberships = {
  oldMP: {
    id: "oldMP",
    post_id: "avalon",
    organization_id: "commons",
    role: "Member of Parliament",
    member: {
      '@type': 'Person',
      id: "fred-bloggs",
    },
    start_date: "2000",
    end_date: "2004",
  },
  backAsMP: {
    id: "backAsMP",
    post_id: "avalon",
    organization_id: "commons",
    role: "Member of Parliament",
    member: {
      '@type': 'Person',
      id: "fred-bloggs",
    },
    start_date: "2011",
  },
};


// go through all the entries and add the _id field
_.each( collections, function(collection) {
  _.each( collection, function (doc) {
    doc._id = doc.id;
  });
});

