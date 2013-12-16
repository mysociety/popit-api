"use strict";

var _ = require('underscore');
var unorm = require('unorm');
var DoubleMetaphone = require('doublemetaphone');

var dm = new DoubleMetaphone();

module.exports = function(schema) {
  schema.add({_internal: Object});

  schema.pre('save', function(next) {
    if (this.name) {
      indexNameWords(this, this.name);
    }
    next();
  });
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
