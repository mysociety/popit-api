/* jshint camelcase: false */

"use strict";

var mongo  = require('mongodb'),
    assert = require('assert'),
    _      = require('underscore'),
    async  = require('async');
 

var server      = new mongo.Server('localhost', 27017, {auto_reconnect: true});
var mongoclient = new mongo.MongoClient(server, {journal: true});
var mongoConnected = false;

var Storage = function (databaseName) {
  assert(databaseName, "Need to provide a database name");
  this.db = mongoclient.db(databaseName);
};


/*
  Get ready to do stuff. Connect to the database.
*/
Storage.connectToDatabase = function (cb) {
  if (!mongoConnected) {
    mongoclient.open(function (err) {
      mongoConnected = !err;
      cb(err);
    });
  } else {
    cb();
  }
};

Storage.generateID = function () {
  var objectId = new mongo.ObjectID();
  return objectId.toHexString();
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

/*
  List documents in the database.
*/
Storage.prototype.list = function (collectionName, cb) {
  var collection = this.db.collection(collectionName);
  var cursor = collection.find({});
  
  cursor.toArray(function (err, docs) {

    _.each(docs, function (doc) {
      doc.id = doc._id;
      delete doc._id;
    });

    cb(err, docs);
  });
};

/*
  Delete a document from the database.
*/
Storage.prototype.delete = function (collectionName, id, cb) {
  var collection = this.db.collection(collectionName);
  collection.remove({_id: id}, cb);
};

module.exports = Storage;
