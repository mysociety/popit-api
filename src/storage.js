/* jshint camelcase: false */

"use strict";

var assert = require('assert');
var mongo = require('mongodb');
var _ = require('underscore');
var unorm = require('unorm');
var regexp_quote = require('regexp-quote');
var DoubleMetaphone = require('doublemetaphone');
var Filter = require('./filter');

var dm = new DoubleMetaphone();

var server      = new mongo.Server('localhost', 27017, {auto_reconnect: true});
var mongoclient = new mongo.MongoClient(server, {journal: true});

mongoclient.open(function (err) {
  if (err) {
    throw err;
  }
});

function Storage(databaseName) {
  assert(databaseName, "Need to provide a database name");
  this.databaseName = databaseName;
  this.db = mongoclient.db(databaseName);
  this.filter = new Filter();
}

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

function indexNameWords(doc, v) {
  // Set normalized array of words for searching
  var words = _.union(
    v.split(/\s+/).map( function(s) {
      return s.toLowerCase();
    }),
    v.split(/\s+/).map( function(s) {
      return unorm.nfkd(s.toLowerCase()).replace(/[\u0300-\u036F]/g, '');
    })
  );
  doc._internal = doc._internal || {};
  doc._internal.name_words = words;
  // Set the double metaphone entries. Currently just stores both primary and secondary without saying which is which
  var dm_words = [];
  words.forEach(function(w) {
    dm_words.push.apply(dm_words, _.values(dm.doubleMetaphone(w)) );
  });
  // Also include the words to make the searching easier. Perhaps this can be just one array?
  doc._internal.name_dm = dm_words.concat(words);
}

/*
  Store a document in the database.
*/
Storage.prototype.store = function (collectionName, doc, cb) {

  if (!doc.id) {
    return cb(new Error("Can't store document without an id"));
  }

  if (doc.name) {
    indexNameWords(doc, doc.name);
  }

  var collection = this.db.collection(collectionName);
  var filter = this.filter;

  deduplicate_slug.apply(doc, [ collection, function() {
    var docToStore = _.extend({}, doc, {_id: doc.id});
    collection.update({_id: doc.id}, docToStore, {upsert: true}, function (err, result) {
      assert(result);
      cb(err, filter.doc(doc));
    });
  } ] );

};

/*
  Retrieve a document from the database.
*/
Storage.prototype.retrieve = function (collectionName, id, cb) {
  var collection = this.db.collection(collectionName);
  var filter = this.filter;
  collection.findOne({_id: id}, function (err, doc) {
    if (err) {
      return cb(err);
    }
    cb(null, filter.doc(doc));
  });
};

/*
  List documents in the database.
*/
Storage.prototype.list = function (collectionName, cb) {
  var collection = this.db.collection(collectionName);
  var filter = this.filter;
  var cursor = collection.find({});
  
  cursor.toArray(function (err, docs) {

    cb(err, filter.docs(docs));
  });
};

/*
  Delete a document from the database.
*/
Storage.prototype.delete = function (collectionName, id, cb) {
  var collection = this.db.collection(collectionName);
  collection.remove({_id: id}, cb);
};

/**
 * Search for a document by name
 */
Storage.prototype.search = function(collectionName, search, cb) {
  if (!search) {
    return cb( null, [] );
  }

  var search_words = search.split(/\s+/);
  var search_words_re = search_words.map( function(word) { return new RegExp( regexp_quote(word), 'i' ); } );

  var collection = this.db.collection(collectionName);
  var filter = this.filter;

  // First do a simple search using regex of search words.
  collection.find({'_internal.name_words': {'$all': search_words_re}}, function(err, docs) {
    if (err) {
      return cb(err);
    }

    if ( docs.length > 0 ) {
      return cb(null, docs);
    }

    // TODO Secondary metaphone results...
    var or = [];
    function perm(s, o) {
      if (s.length) {
        o.push( new RegExp(regexp_quote(s[0]), 'i') );
        perm(s.slice(1), o);
        o.pop();
        o.push( dm.doubleMetaphone(s[0]).primary );
        perm(s.slice(1), o);
        o.pop();
      } else {
        or.push( { '_internal.name_dm': { '$all': o.slice(0) } } );
      }
    }
    perm(search_words, []);

    // Perform a double metaphone search.
    collection.find({'$or': or}, function(err, result) {
      result.toArray(function(err, docs) {
        if (err) {
          return cb(err);
        }
        cb(null, filter.docs(docs));
      });
    });

  });
};

module.exports = Storage;
