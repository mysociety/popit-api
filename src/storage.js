/* jshint camelcase: false */

"use strict";

var assert = require('assert');
var _ = require('underscore');
var mongoose = require('mongoose');
var collections = require('./collections');


var connections = {};

function Storage(databaseName) {
  assert(databaseName, "Need to provide a database name");
  this.databaseName = databaseName;
  if (connections[databaseName]) {
    this.connection = connections[databaseName];
  } else {
    this.connection = connections[databaseName] = mongoose.createConnection('localhost', databaseName);
  }
}

Storage.generateID = function () {
  var objectId = new mongoose.Types.ObjectId();
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
  var collection = this.connection.model(collections[collectionName]);
  if (!doc.id) {
    doc.id = Storage.generateID();
  }
  if (!doc._id) {
    doc._id = doc.id;
  }
  collection.findOneAndUpdate({_id: doc.id}, doc, {upsert: true}, cb);
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

  // If there are document specific hidden fields add them to fields.all
  if (fields[id]) {
    _.extend(fields.all, fields[id]);
  }

  var collection = this.connection.model(collections[collectionName]);
  collection.findOne({_id: id}, fields.all || {}, function (err, doc) {
    if (err) {
      return cb(err);
    }
    cb(null, doc);
  });
};

/*
  List documents in the database.
*/
Storage.prototype.list = function (collectionName, fields, cb) {
  if (typeof fields === 'function') {
    cb = fields;
    fields = {};
  }
  fields = fields || {};

  var collection = this.connection.model(collections[collectionName]);
  collection.find({}, function(err, docs) {
    if (err) {
      return cb(err);
    }
    docs.forEach(function (doc) {
      if (fields[doc._id]) {
        for (var field in fields[doc._id]) {
          var value = fields[doc._id][field];
          if (value === false) {
            delete doc[field];
          }
        }
      }
    });

    cb(err, docs);
  });
};

/*
  Delete a document from the database.
*/
Storage.prototype.delete = function (collectionName, id, cb) {
  var collection = this.connection.model(collections[collectionName]);
  collection.remove({_id: id}, cb);
};

module.exports = Storage;
