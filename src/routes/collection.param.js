"use strict";

var hiddenFields = require('../middleware/hidden-fields');
var models = require('../models');

module.exports = function(app) {
  /**
   * Check that the collection is in the allowed list, if it is then expose
   * it as req.collection.
   */
  app.param('collection', function (req, res, next, collection) {
    // If the collection exists, carry on.
    if (!models[collection]) {
      return res.status(404).jsonp({
        errors: ["collection '" + collection + "' not found"]
      });
    }

    req.model = models[collection];
    req.collection = req.db.model(models[collection].modelName);

    next();
  });

  /**
   * Handle hidden fields on collections.
   */
  app.param('collection', hiddenFields);

};
