"use strict";

var async = require('async');
var validateBody = require('../../middleware/validate-body');
var transform = require('../../transform');

var tidyUpInlineMembershipError = require('../../inline-memberships').tidyUpInlineMembershipError;
var processMembership = require('../../inline-memberships').processMembership;

module.exports = function(app) {

  app.post('/:collection', validateBody, function (req, res, next) {
    var body = req.body;
    // if there's an image and no body.images then add one as the popit front end uses
    // that at the moment
    if ( body.image && !body.images ) {
      body.images = [ { url: body.image } ];
    }

    var memberships = body.memberships;
    req.created_memberships = [];
    req.updated_memberships = [];
    delete body.memberships;
    req.collection.create(body, function (err, doc) {
      if (err) {
        return next(err);
      }
      if ( memberships ) {
        // we do this in series otherwise if there's an error we might not
        // have recorded all the memberships created and hence can't
        // undo things correctly
        async.eachSeries(memberships, function callProcessMembership(membership, done) {
            processMembership(membership, req, doc, done);
          }, function afterCreateMemberships(err) {
          if (err) {
            tidyUpInlineMembershipError(req, doc, req.created_memberships, null, function(innerErr) {
              if ( innerErr ) {
                return res.send(400, {errors: [innerErr]});
              }
              return res.send(400, {errors: [err]});
            });
          } else {
            doc.populateMemberships(req, function (err) {
              if (err) {
                tidyUpInlineMembershipError(req, doc, req.created_memberships, null, function(err) {
                  return res.send(400, {errors: [err]});
                });
              } else {
                res.withBody(transform(doc, req));
              }
            });
          }
        });
      } else {
        res.withBody(transform(doc, req));
      }
    });
  });

};
