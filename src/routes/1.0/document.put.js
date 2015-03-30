"use strict";

var async = require('async');
var mongoose = require('mongoose');
var validateBody = require('../../middleware/validate-body');

var tidyUpInlineMembershipError = require('../../inline-memberships').tidyUpInlineMembershipError;
var processMembership = require('../../inline-memberships').processMembership;
var removeOldMemberships = require('../../inline-memberships').removeOldMemberships;

module.exports = function(app) {

  app.put('/:collection/:id(*)', validateBody, function (req, res, next) {

    var id = req.params.id;
    var body = req.body;

    if (id !== body.id) {
      return res
        .status(400)
        .jsonp({
          errors: ["URL id and document id are different"]
        });

    }

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        doc = new req.collection();
      }
      delete body.__v;

      /* this is to make sure that the _id property is the same for things added via
       * the api and the front end. If not then elasticsearch doesn't index it as it
       * confuses it's auto mapping.
       */
      if ( body.images ) {
        var images = [];
        body.images.forEach( function(img) {
          if (img.id) {
            img._id = new mongoose.Types.ObjectId(img.id);
          } else if ( img._id ) {
            img._id = new mongoose.Types.ObjectId(img._id);
          }
          images.push(img);
        });
        body.images = images;
      }

      // if there's an image and no body.images then add one as the popit front end uses
      // that at the moment
      if ( body.image && !body.images ) {
        body.images = [ { url: body.image } ];
      }
      var memberships = body.memberships;
      var key = req.collection.modelName.toLowerCase() + '_id';
      req.created_memberships = [];
      req.updated_memberships = [];
      delete body.memberships;
      if ( memberships ) {
        // we do this in series otherwise if there's an error we might not
        // have recorded all the memberships created/updated and hence can't
        // undo things correctly
        async.eachSeries(memberships, function callProcessMembership(membership, done) {
            processMembership(membership, req, doc, done);
          }, function afterCreateMemberships(err) {
          if (err) {
            tidyUpInlineMembershipError(req, null, req.created_memberships, req.updated_memberships, function(innerErr) {
              if ( innerErr ) {
                return res.send(400, {errors: [innerErr]});
              }
              return res.send(400, {errors: [err]});
            });
            return;
          }
          removeOldMemberships(req, memberships, key, doc.id, function(err, removed) {
            if (err) {
              return next(err);
            }
            req.updated_memberships = req.updated_memberships.concat(removed);
            doc.set(body);
            doc.save(function(err) {
              if (err) {
                tidyUpInlineMembershipError(req, null, req.created_memberships, req.updated_memberships, function(innerErr) {
                  if ( innerErr ) {
                    return res.send(400, {errors: [innerErr]});
                  }
                  return res.send(400, {errors: [err]});
                });
                return;
              }
              doc.populateMemberships(req, function(err) {
                if (err) {
                  return next(err);
                }
                res.withBody(doc);
              });
            });
          });
        });
      } else {
        doc.set(body);
        doc.save(function(err) {
          if (err) {
            return next(err);
          }
          res.withBody(doc);
        });
      }
    });

  });
};
