"use strict";

var _ = require('underscore');
var mongoose = require('mongoose');
var models = require('./models');
var async = require('async');

function removeMemberships(memberships, callback) {
  async.each(memberships, function deleteMembership(membership, done) {
    membership.remove(done);
  }, function (err) {
    callback(err);
  });
}

function restoreMemberships(req, memberships, callback) {
  var Membership = req.db.model(models.memberships.modelName);
  async.each(memberships, function restoreMembership(membership, done) {
    Membership.findById(membership.id, function(err, mem) {
      if (mem) {
        mem.set(membership);
        mem.save(function(err) {
          if (err) {
            return done(err);
          }
          return done();
        });
      } else {
        membership._id = membership.id;
        Membership.create(membership, function (err, mem) {
          if ( err ) {
            return done(err);
          }
          done(null, mem);
        });
      }
    });
  }, function (err) {
    callback(err);
  });
}

function tidyUpInlineMembershipError(req, doc, created, updated, callback) {
  if (doc) {
    doc.remove(function(err) {
      if (err) {
        return callback(err);
      }
      removeMemberships(created, callback);
    });
  } else {
    removeMemberships(created, function (err) {
      if (err) {
        return callback(err);
      }
      restoreMemberships(req, updated, callback);
    });
  }
}

function checkMembership(req, membership, doc, done) {
  if ( req.model.modelName == 'Person' ) {
    if ( !membership.person_id ) {
      membership.person_id = doc.id;
    } else if ( membership.person_id != doc.id ) {
      return done("person id (" + membership.person_id + ") in membership and person id (" + doc.id + ") are mismatched");
    }
  } else if ( req.model.modelName == 'Organization' ) {
    if ( !membership.organization_id ) {
      membership.organization_id = doc.id;
    } else if ( membership.organization_id != doc.id ) {
      return done("organization id (" + membership.organization_id + ") in membership and organization id (" + doc.id + ") are mismatched");
    }
  } else if ( req.model.modelName == 'Post' ) {
    if ( !membership.post_id ) {
      membership.post_id = doc.id;
    } else if ( membership.post_id != doc.id ) {
      return done("post id (" + membership.post_id + ") in membership and post id (" + doc.id + ") are mismatched");
    }
  }
  return done(null, membership);
}

function createMembership(req, membership, done) {
  if ( !membership.id ) {
    var id = new mongoose.Types.ObjectId();
    membership.id = id.toHexString();
  }
  membership._id = membership.id;
  var Membership = req.db.model(models.memberships.modelName);
  Membership.create(membership, function (err, mem) {
    if ( err ) {
      return done(err);
    }
    done(null, mem);
  });
}

function processMembership(membership, req, doc, done) {
  var existing = false;
  var Membership = req.db.model(models.memberships.modelName);
  async.waterfall([
    function callCheckMembership(cb) {
      checkMembership(req, membership, doc, cb);
    },
    function callCreateMembership(membership, cb) {
      if ( ! membership.id ) {
        createMembership(req, membership, function(err, membership) {
          if ( err ) {
            return cb(err);
          }
          req.created_memberships.push(membership);
          cb();
        });
      } else {
        Membership.findById(membership.id, function(err, mem) {
          if (mem) {
            existing = true;
            req.updated_memberships.push(mem.toJSON());
            mem.set(membership);
            mem.save(function(err) {
              if (err) {
                return cb(err);
              }
              return cb();
            });
          } else {
            createMembership(req, membership, function(err, membership) {
              if ( err ) {
                return cb(err);
              }
              req.created_memberships.push(membership);
              cb();
            });
          }
        });
      }
    }], function membershipCreated(err) {
      if (err) {
        return done(err);
      }
      done();
    });
}

function removeOldMemberships(req, memberships, key, id, done) {
  var membership_ids =
    _.chain(memberships)
     .map( function(membership) { return membership.id; })
     .compact()
     .value();

  var Membership = req.db.model(models.memberships.modelName);
  var criteria = {};
  criteria[key] = id;
  var removed = [];
  Membership
    .find( criteria )
    .where( '_id' ).nin( membership_ids )
    .exec( function( err, memberships ) {
      if ( err ) {
        return done(err);
      }
      async.forEachSeries(memberships, function(membership, done) {
        removed.push(membership.toJSON());
        membership.remove(done);
      }, function (err) {
        if (err) {
          return done(err);
        }
        done(null, removed);
      });
    });
}

module.exports.tidyUpInlineMembershipError = tidyUpInlineMembershipError;
module.exports.processMembership = processMembership;
module.exports.removeOldMemberships = removeOldMemberships;
