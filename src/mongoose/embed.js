"use strict";

/**
 * Handles embedding documents using the ?embed parameter as well as populating
 * their associated memberships.
 */

var _ = require('underscore');
var async = require('async');
var mpath = require('mpath');
var util = require('util');
var transform = require('../transform');

function InvalidEmbedError(message, explanation) {
  this.name = 'InvalidQueryError';
  this.message = message || "Invalid embed parameter";
  this.explaination = explanation;
}
util.inherits(InvalidEmbedError, Error);

function getDocs(path, doc) {
  var models = mpath.get(path, doc, '_doc');
  // For a path like 'membership.person.membership.organization mpath will
  // return an array of arrays. We don't need that level of nesting, so we
  // flatten it here before iterating over it.
  models = _.flatten(models);
  // Remove any null values from the models array
  models = _.compact(models);
  return models;
}

/**
 * Populate memberships of embedded documents.
 */
function populateMemberships(req, doc, path, callback) {
  var modelsToPopulate = getDocs(path, doc);
  // Make sure all the models have the necessary method on them.
  modelsToPopulate = _.filter(modelsToPopulate, function(model) {
    return _.isObject(model) && _.isFunction(model.populateMemberships);
  });

  async.each(modelsToPopulate, function(val, done) {
    val.populateMemberships(req, done);
  }, callback);
}

function populateJoins(req, doc, opt, callback) {
  if (opt.newEmbedNames) {
    getDocs(opt.collection, doc).forEach(function(membership) {
      membership[opt.to] = membership[opt.from];
    });
  }
  doc.populate(opt, function(err, doc) {
    if (err) {
      return callback(err);
    }
    // Make sure populated models have been transformed
    var modelsToTransform = getDocs(opt.path, doc);
    modelsToTransform = modelsToTransform.map(function(model) {
      return transform(model, req);
    });
    if (opt.populateMemberships) {
      populateMemberships(req, doc, opt.path, callback);
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
  schema.methods.embedDocuments = function embedDocuments(req, newEmbedNames, callback) {
    if (typeof newEmbedNames === 'function') {
      callback = newEmbedNames;
      newEmbedNames = false;
    }
    var doc = this;
    var embed = req.query.embed;

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

    var target_map;
    if (newEmbedNames) {
      target_map = {
        'membership.person': {
          path: 'memberships.person',
          from: 'person_id',
          to: 'person',
          model: 'Person',
        },
        'membership.organization': {
          path: 'memberships.organization',
          from: 'organization_id',
          to: 'organization',
          model: 'Organization',
        },
        'membership.post': {
          path: 'memberships.post',
          from: 'post_id',
          to: 'post',
          model: 'Post',
        },
      };
    } else {
      target_map = {
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
    }

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
      join_structure.push({
        path: path.join('.'),
        model: this_map.model,
        populateMemberships: true,
        collection: path.slice(0, -1).concat(['memberships']).join('.'),
        from: this_map.from,
        to: this_map.to,
      });
    });

    var last = join_structure[join_structure.length - 1];
    if (skipLastEmbed && last) {
      last.populateMemberships = false;
    }

    doc.populateMemberships(req, function(err) {
      if (err) {
        return callback(err);
      }
      async.eachSeries(join_structure, function(structure, done) {
        structure.newEmbedNames = newEmbedNames;
        populateJoins(req, doc, structure, done);
      }, callback);
    });
  };
}

module.exports = exports = embedPlugin;
exports.InvalidEmbedError = InvalidEmbedError;
