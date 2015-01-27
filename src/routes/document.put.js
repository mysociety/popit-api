"use strict";

var mongoose = require('mongoose');
var validateBody = require('../middleware/validate-body');
var transform = require('../transform');

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
          if ( img._id ) {
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
      doc.set(body);
      doc.save(function(err) {
        if (err) {
          return next(err);
        }
        res.withBody(transform(doc, req));
      });
    });

  });
};
