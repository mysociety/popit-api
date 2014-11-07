"use strict";

var _ = require('underscore');

/**
 * Mongoose plugin for merging two people together.
 */

module.exports = function mergePlugin(schema) {
  schema.methods.merge = function merge(other, callback) {
    var self = this;
    var conflicts = [];
    schema.eachPath(function(path) {
      var selfValue = self.get(path);
      var otherValue = other.get(path);
      // Skip 'hidden' paths starting with an underscore.
      if (path.substr(0, 1) === '_') {
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
      if (Array.isArray(otherValue)) {
        otherValue.forEach(function(otherItem) {
          var matchFound = false;
          selfValue.forEach(function(item) {
            if (_.isEqual(_.omit(item.toObject(), '_id'), _.omit(otherItem.toObject(), '_id'))) {
              // Match found, no need to copy this item over.
              matchFound = true;
            }
          });
          if (!matchFound) {
            selfValue.push(otherItem.toObject());
          }
        });
        return;
      }
      // Copy otherValue directly if there is no existing value on self.
      if (!selfValue && otherValue) {
        self.set(path, otherValue);
        return;
      }
      // If the two documents have conflicting values then add to conflicts.
      if (selfValue && otherValue && otherValue !== selfValue) {
        conflicts.push("Please resolve conflict with " + path + ": " + selfValue + " doesn't match " + otherValue);
        return;
      }
    });
    // TODO Make this error class more specific
    if (conflicts.length > 0) {
      return callback(new Error(conflicts.join('\n')));
    }
    callback();
  };
};
