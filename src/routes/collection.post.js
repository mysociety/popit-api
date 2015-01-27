"use strict";

var validateBody = require('../middleware/validate-body');
var transform = require('../transform');

module.exports = function(app) {

  app.post('/:collection', validateBody, function (req, res, next) {
    var body = req.body;
    // if there's an image and no body.images then add one as the popit front end uses
    // that at the moment
    if ( body.image && !body.images ) {
      body.images = [ { url: body.image } ];
    }
    req.collection.create(body, function (err, doc) {
      if (err) {
        return next(err);
      }
      res.withBody(transform(doc, req));
    });

  });
};
