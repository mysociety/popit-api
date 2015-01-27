"use strict";

var async = require('async');
var MergeConflictError = require('../mongoose/merge').MergeConflictError;
var transform = require('../transform');

module.exports = function(app) {

  /**
   * Merge two people together.
   *
   * TODO Possibly make this work for any collection?
   */
  app.post('/:collection/:id/merge/:otherId', function(req, res, next) {
    var id = req.params.id;
    var otherId = req.params.otherId;
    if (req.params.collection !== 'persons') {
      return res.jsonp(400, {errors: ["The merge method currently only works with people"]});
    }
    if (id === otherId) {
      return res.jsonp(400, {errors: ["Can't merge a person into themselves"]});
    }
    async.map([id, otherId], req.collection.findById.bind(req.collection), function(err, results) {
      if (err) {
        return next(err);
      }
      var person = results[0];
      var otherPerson = results[1];
      if (!person) {
        return res.jsonp(404, {errors: ["id '" + id + "' not found"]});
      }
      if (!otherPerson) {
        return res.jsonp(404, {errors: ["id '" + otherId + "' not found"]});
      }
      person.merge(otherPerson, function(err) {
        if (err) {
          if (err instanceof MergeConflictError) {
            return res.send(400, {errors: [err.message].concat(err.conflicts)});
          }
          return next(err);
        }
        person.save(function(err) {
          if (err) {
            return next(err);
          }
          otherPerson.remove(function(err) {
            if (err) {
              return next(err);
            }
            res.withBody(transform(person, req));
          });
        });
      });
    });
  });
};
