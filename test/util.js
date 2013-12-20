"use strict";

var exec = require('child_process').exec;
var defaults = require('./defaults');

exports.person = person;

function person(attrs) {
  attrs.memberships = [];
  attrs.links = [];
  attrs.contact_details = [];
  attrs.identifiers = [];
  attrs.other_names = [];
  return attrs;
}

exports.loadFixture = loadFixture;

/**
 * Populate collection using the json at fixturePath. The json file
 * should be produced by mongoexport.
 *
 * @param {String} collection The name of the collection to populate
 * @param {String} fixturePath Path to a json file produced by mongoexport
 * @return {Function} A function that can be used in mocha hooks
 */
function loadFixture(collection, fixturePath) {
  return function(done) {
    var cmd =
      'mongoimport ' +
      '--db ' + defaults.databaseName +
      ' --collection ' + collection +
      ' < ' + fixturePath;
    exec(cmd, done);
  };
}
