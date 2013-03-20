/* jshint camelcase: false */

"use strict";

var mongo  = require('mongodb'),
    assert = require('assert'),
    _      = require('underscore'),
    async  = require('async');
 
var server = new mongo.Server('localhost', 27017, {auto_reconnect: true});

// store the databases in here as they are created.
var databases = {};


var Storage = function (databaseName) {
  assert(databaseName, "Need to provide a database name");
  this.databaseName = databaseName;
};

/*
  Get ready to do stuff. Connect to the database.
*/
Storage.prototype.init = function (cb) {
  var storage = this;

  // db already set up, store it and move on
  if (databases[this.databaseName]) {
    storage.db = databases[storage.databaseName];
    return cb(null);
  }

  // open new database
  var db = new mongo.Db(storage.databaseName, server, {journal: true});
  
  db.open(function (err, db) {
    if (!err) {
      databases[storage.databaseName] = db;
      storage.db = db;
    }
    cb(err);
  });
};

/*
  Empty the database of all data. Not something you'd want to do in production :)
*/
Storage.prototype.empty = function (cb) {
  var storage = this;

  storage.db.collections(function(err, collections) {
    var names = _.chain(collections)
      .pluck('collectionName')
      .reject(function (name) { return (/^system\./).test(name); })
      .value();

    async.each(
      names,
      function (name, done) { storage.db.dropCollection(name, done); },
      cb
    );
  });
};


/*
  Store a document in the database.
*/
Storage.prototype.store = function (collectionName, doc, cb) {

  if (!doc.id) {
    return cb(new Error("Can't store document without an id"));
  }

  var docToStore = _.extend({}, doc, {_id: doc.id});

  var collection = this.db.collection(collectionName);
  collection.update({_id: doc.id}, docToStore, {upsert: true}, function (err, result) {
    assert(result);
    cb(err, doc);
  });
};

/*
  Retrieve a document from the database.
*/
Storage.prototype.retrieve = function (collectionName, id, cb) {
  var collection = this.db.collection(collectionName);
  collection.findOne({_id: id}, function (err, doc) {
    if (doc) {
      doc.id = doc._id;
      delete doc._id;
    }
    cb(err, doc);
  });
};

module.exports = Storage;
