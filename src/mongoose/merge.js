"use strict";

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
        // TODO Handle arrays
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
    if (conflicts.length > 0) {
      return callback(new Error(conflicts.join('\n')));
    }
    callback();
  };
};
