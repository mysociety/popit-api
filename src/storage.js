/* jshint camelcase: false */

"use strict";

var mongo  = require('mongodb'),
    assert = require('assert'),
    _      = require('underscore'),
    unorm  = require('unorm'),
    regexp_quote      = require('regexp-quote'),
    DoubleMetaphone = require('doublemetaphone'),
    dm = new DoubleMetaphone();

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
  this.fields = {all: {}};
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

  var fields = this.fields;

  if (!doc.id) {
    return cb(new Error("Can't store document without an id"));
  }

  if (doc.name) {
    indexNameWords(doc, doc.name);
  }

  var collection = this.db.collection(collectionName);

  deduplicate_slug.apply(doc, [ collection, function() {
    var docToStore = _.extend({}, doc, {_id: doc.id});
    collection.update({_id: doc.id}, docToStore, {upsert: true}, function (err, result) {
      assert(result);
      cb(err, filterDoc(doc, fields));
    });
  } ] );

};

/*
  Retrieve a document from the database.
*/
Storage.prototype.retrieve = function (collectionName, id, cb) {
  var fields = this.fields;
  // If there are document specific hidden fields add them to fields.all
  if (fields[id]) {
    _.extend(fields.all, fields[id]);
  }

  var collection = this.db.collection(collectionName);
  collection.findOne({_id: id}, fields.all, function (err, doc) {
    if (err) {
      return cb(err);
    }
    cb(null, filterDoc(doc, fields));
  });
};

/*
  List documents in the database.
*/
Storage.prototype.list = function (collectionName, cb) {
  var fields = this.fields;
  var collection = this.db.collection(collectionName);
  var cursor = collection.find({}, fields.all);
  
  cursor.toArray(function (err, docs) {

    cb(err, filterDocs(docs, fields));
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

  var fields = this.fields;
  var collection = this.db.collection(collectionName);

  // First do a simple search using regex of search words.
  collection.find({'_internal.name_words': {'$all': search_words_re}}, fields.all, function(err, docs) {
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
    collection.find({'$or': or}, {name: true, slug: true}, function(err, result) {
      result.toArray(function(err, docs) {
        if (err) {
          return cb(err);
        }
        cb(null, filterDocs(docs, fields));
      });
    });

  });
};

function filterDoc(doc, fields) {
  if (!doc) {
    return;
  }
  if (doc._id) {
    doc.id = doc._id;
    delete doc._id;
  }

  for (var field in doc) {
    // Remove any fields that have been hidden on this doc.
    if (fields[doc.id]) {
      var value = fields[doc.id][field];
      if (value === false) {
        delete doc[field];
      }
    }

    // Remove 'hidden' fields starting with an underscore.
    if (field.substr(0, 1) === '_') {
      delete doc[field];
    }
  }
  return doc;
}

/**
 * Filter passed docs using the fields argument.
 *
 * @param {Array} docs The docs to filter
 * @param {Object} fields The field spec to use when filtering
 * @return {Array} The array of docs after processing
 */
function filterDocs(docs, fields) {
  docs.forEach(function (doc) {
    filterDoc(doc, fields);
  });
  return docs;
}

module.exports = Storage;
