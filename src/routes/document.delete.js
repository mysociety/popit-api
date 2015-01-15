"use strict";

module.exports = function(app) {

  app.delete('/:collection/:id(*)', function (req, res, next) {
    var id = req.params.id;

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.send(204);
      }
      doc.remove(function(err) {
        if (err) {
          return next(err);
        }
        res.send(204);
      });
    });
  });

};
