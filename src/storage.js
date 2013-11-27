/* jshint camelcase: false */

"use strict";

var mongo  = require('mongodb'),
    assert = require('assert'),
    _      = require('underscore');
 

var server      = new mongo.Server('localhost', 27017, {auto_reconnect: true});
var mongoclient = new mongo.MongoClient(server, {journal: true});
var mongoConnected = false;

var Storage = function (databaseName) {
  assert(databaseName, "Need to provide a database name");
  this.databaseName = databaseName;
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

function deduplicate_slug(collection, cb) {
  /*jshint validthis:true */
  var self = this;

  if (!self.slug) {
    return cb(null);
  }

  // find other entries in the database that have the same slug
  collection.findOne({ slug: self.slug, _id: { $ne: self.id } }, function(err, doc) {
    if (err) {
      return cb(err);
    }

    // if nothing found then no need to change slug
    if ( ! doc ) {
      return cb(null);
    }

    // we have a conflict, increment the slug
    var matches = self.slug.match(/^(.*)\-(\d+)$/);

    if ( !matches ) {
      self.slug = self.slug + '-1';
    } else {
      var base_slug = matches[1];
      var counter   = parseInt( matches[2], 10 ) + 1;
      self.slug     = base_slug + '-' + counter;
    }

    return deduplicate_slug.apply( self, [ collection, cb ] ); // recurse

  });
}

/*
  Store a document in the database.
*/
Storage.prototype.store = function (collectionName, doc, cb) {

  if (!doc.id) {
    return cb(new Error("Can't store document without an id"));
  }

  var collection = this.db.collection(collectionName);

  deduplicate_slug.apply(doc, [ collection, function() {
    var docToStore = _.extend({}, doc, {_id: doc.id});
    collection.update({_id: doc.id}, docToStore, {upsert: true}, function (err, result) {
      assert(result);
      cb(err, doc);
    });
  } ] );

};

/*
  Retrieve a document from the database.
*/
Storage.prototype.retrieve = function (collectionName, id, fields, cb) {
  if (typeof fields === 'function') {
    cb = fields;
    fields = {};
  }
  fields = fields || {};

  var collection = this.db.collection(collectionName);
  collection.find({_id: id}, fields, function (err, docs) {
    if (err) {
      return cb(err);
    }
    docs.toArray(function(err, docs) {
      if (err) {
        return cb(err);
      }
      var doc = docs[0];
      if (doc) {
        doc.id = doc._id;
        delete doc._id;
      }
      cb(null, doc);
    });
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
