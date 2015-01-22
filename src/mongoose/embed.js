"use strict";

/**
 * Handles embedding documents using the ?embed parameter as well as populating
 * their associated memberships.
 */

var _ = require('underscore');
var async = require('async');
var mpath = require('mpath');
var util = require('util');

function InvalidEmbedError(message, explanation) {
  this.name = 'InvalidQueryError';
  this.message = message || "Invalid embed parameter";
  this.explaination = explanation;
}
util.inherits(InvalidEmbedError, Error);

/**
 * Populate memberships of embedded documents.
 */
function populateMemberships(doc, path, callback) {
  var modelsToPopulate = mpath.get(path, doc, '_doc');

  // For a path like 'membership.person.membership.organization mpath will
  // return an array of arrays. We don't need that level of nesting, so we
  // flatten it here before iterating over it.
  modelsToPopulate = _.flatten(modelsToPopulate);

  // Remove any null values from the modelsToPopulate array and make sure all
  // the members have the necessary method on them.
  modelsToPopulate = _.compact(modelsToPopulate);
  modelsToPopulate = _.filter(modelsToPopulate, function(model) {
    return _.isObject(model) && _.isFunction(model.populateMemberships);
  });

  async.each(modelsToPopulate, function(val, done) {
    val.populateMemberships(done);
  }, callback);
}

function populateJoins(doc, opt, callback) {
  doc.populate(opt, function(err) {
    if (err) {
      return callback(err);
    }
    if (opt.populateMemberships) {
      populateMemberships(doc, opt.path, callback);
    } else {
      callback();
    }
  });
}

function embedPlugin(schema) {

  /**
   * Taked the ?embed parameter and embeds any people, organizations or
   * memberships that have been requested.
   */
  schema.methods.embedDocuments = function embedDocuments(embed, callback) {
    var doc = this;

    // Default to embedding one layer of memberships
    if (!_.isString(embed)) {
      embed = 'membership';
    }
    // Run the callback async if there's no embed requested
    if (embed === '') {
      return process.nextTick(callback);
    }

    // Check if the final layer of memberships should be included
    var originalEmbed = embed;
    var parts = embed.split('.');
    var skipLastEmbed = true;
    if (parts[parts.length - 1] === 'membership') {
      skipLastEmbed = false;
      embed = parts.slice(0, -1).join('.');
    }

    var target_re = /((?:membership\.\w+)+)/g;
    var targets = [];
    var match;
    while ( targets.length < 3 && ( match = target_re.exec(embed) ) ) {
      targets.push(match[0]);
    }
    var target_map = {
      'membership.person': {
        path: 'memberships.person_id',
        model: 'Person',
      },
      'membership.organization': {
        path: 'memberships.organization_id',
        model: 'Organization',
      },
      'membership.post': {
        path: 'memberships.post_id',
        model: 'Post',
      },
    };

    var invalidTargets = !_.all(targets, function(target) { return target_map[target]; });
    var missingTargets = targets.join('.') !== embed;
    if (invalidTargets || missingTargets) {
      var message = 'Invalid embed parameter ' + originalEmbed;
      var explaination = 'embed must be one of ' + Object.keys(target_map).join(', ');
      var error = new InvalidEmbedError(message, explaination);
      return callback(error);
    }

    var join_structure = [];
    var path = [];
    _.each(targets, function(target) {
      var this_map = target_map[target];
      path.push( this_map.path );
      join_structure.push({ path: path.join('.'), model: this_map.model, populateMemberships: true });
    });

    var last = join_structure[join_structure.length - 1];
    if (skipLastEmbed && last) {
      last.populateMemberships = false;
    }

    doc.populateMemberships(function(err) {
      if (err) {
        return callback(err);
      }
      async.eachSeries(join_structure, function(structure, done) {
        populateJoins(doc, structure, done);
      }, callback);
    });
  };
}

module.exports = exports = embedPlugin;
exports.InvalidEmbedError = InvalidEmbedError;
