"use strict";

var powMongoDBFixtures = require("pow-mongodb-fixtures"),
    defaults           = require("./defaults");


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
    _id: "fred-bloggs",
    name: "Fred Bloggs",
    email: 'fbloggs@example.org',
  },
  joeBloggs: {
    _id: "joe-bloggs",
    name: "Joe Bloggs",
    email: "jbloggs@example.org",
  },
};

collections.organizations = {
  parliament: {
    _id: "parliament",
    name: "Houses of Parliament",
  },
  commons: {
    _id: "commons",
    name: "House of Commons",
    parent_id: "parliament",
  },
};

collections.posts = {
  annapolis: {
    _id: "annapolis",
    organization_id: "commons",
    label: "MP for Annapolis",
    role: "Member of Parliament",
    area: { name: "Annapolis", id: "http://mapit.example.org/area/1" },
  },
  avalon: {
    _id: "avalon",
    organization_id: "commons",
    label: "MP for Avalon",
    role: "Member of Parliament",
    area: { name: "Avalon", id: "http://mapit.example.org/area/2" },
  },
};

collections.memberships = {
  oldMP: {
    _id: "oldMP",
    post_id: "avalon",
    organization_id: "commons",
    role: "Member of Parliament",
    person_id: "fred-bloggs",
    start_date: "2000",
    end_date: "2004",
  },
  backAsMP: {
    _id: "backAsMP",
    post_id: "avalon",
    organization_id: "commons",
    role: "Member of Parliament",
    person_id: "fred-bloggs",
    start_date: "2011",
  },
};
