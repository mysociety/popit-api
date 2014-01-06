"use strict";

var fs = require('fs');
var spawn = require('child_process').spawn;
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
    var args = [
      '--db', defaults.databaseName,
      '--collection', collection
    ];
    var mongoimport = spawn('mongoimport', args);

    fs.createReadStream(fixturePath).pipe(mongoimport.stdin);

    mongoimport.stdout.on('data', function(data) {
      console.log(data.toString());
    });

    mongoimport.stderr.on('data', function(data) {
      console.error(data.toString());
    });

    mongoimport.on('close', function(code) {
      done(null, code);
    });
  };
}
