"use strict";

var _ = require('underscore');
var unorm = require('unorm');
var DoubleMetaphone = require('doublemetaphone');
var regexpQuote = require('regexp-quote');

var dm = new DoubleMetaphone();

module.exports = function(schema) {
  schema.add({_internal: Object});

  schema.pre('save', function(next) {
    if (this.name) {
      indexNameWords(this, this.name);
    }
    next();
  });

  schema.statics.search = function(search, cb) {
    var self = this;
    if (!search) {
      return cb( null, [] );
    }

    var search_words = search.split(/\s+/);
    var search_words_re = search_words.map( function(word) { return new RegExp( regexpQuote(word), 'i' ); } );

    // First do a simple search using regex of search words.
    self.find({'_internal.name_words': {'$all': search_words_re}}, function(err, docs) {
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
          o.push( new RegExp(regexpQuote(s[0]), 'i') );
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
      self.find({'$or': or}, cb);
    });
  };
};

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
