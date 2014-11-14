"use strict";

var _ = require('underscore');
var inherits = require('util').inherits;

function MergeConflictError(message, conflicts) {
  this.name = 'MergeConflictError';
  this.message = message;
  this.conflicts = conflicts;
}
inherits(MergeConflictError, Error);

function mergeArrays(selfValue, otherValue) {
  var matchFound;
  otherValue.forEach(function(otherItem) {
    matchFound = false;
    selfValue.forEach(function(item) {
      if (item.toObject) {
        item = _.omit(item.toObject(), '_id');
      }
      if (otherItem.toObject) {
        otherItem = _.omit(otherItem.toObject(), '_id');
      }
      if (_.isEqual(item, otherItem)) {
        // Match found, no need to copy this item over.
        matchFound = true;
      }
    });
    if (!matchFound) {
      selfValue.push(otherItem);
    }
  });
}

/**
 * Mongoose plugin for merging two people together.
 */

module.exports = exports = function mergePlugin(schema) {
  schema.methods.merge = function merge(other, callback) {
    var self = this;
    var conflicts = [];
    var pathsToMerge = Object.keys(other.toObject());
    _.each(pathsToMerge, function(path) {
      var selfValue = self.get(path);
      var otherValue = other.get(path);
      // Skip 'hidden' paths starting with an underscore.
      if (path.substr(0, 1) === '_') {
        return;
      }
      // Ignore the 'id' field
      if (path === 'id') {
        return;
      }
      // If there's no corresponding value skip this path
      if (!otherValue) {
        return;
      }
      // Special case for name, add it to other_names if they don't match
      if (path === 'name') {
        if (selfValue !== otherValue) {
          self.other_names.push({
            name: otherValue
          });
        }
        return;
      }
      // Copy otherValue directly if there is no existing value on self.
      if (!selfValue && otherValue) {
        self.set(path, otherValue);
        return;
      }
      if (Array.isArray(selfValue) && Array.isArray(otherValue)) {
        mergeArrays(selfValue, otherValue);
        return;
      }
      // If the two documents have conflicting values then add to conflicts.
      if (selfValue && otherValue && otherValue !== selfValue) {
        conflicts.push("Please resolve conflict with " + path + ": " + selfValue + " doesn't match " + otherValue);
        return;
      }
    });
    if (conflicts.length > 0) {
      return callback(new MergeConflictError('Unresolvable merge conflict', conflicts));
    }
    callback();
  };
};

exports.MergeConflictError = MergeConflictError;
