"use strict";

var eachSchema = require('../utils').eachSchema;

module.exports = apiLinksMiddleware;

/**
 * If the apiBaseUrl argument is given then configure the models to include
 * links in their output.
 *
 * @param {Object} options The options to configure this function
 * @param {String} options.baseUrl The url where the main app is located
 * @param {String} options.apiBaseUrl The url where the API is mounted
 * @param {String} options.proxyBaseUrl The url of the image proxy
 * @return {Function} Express compatible middleware.
 */
function apiLinksMiddleware(options) {
  return function apiLinks(req, res, next) {
    eachSchema(req.db, function(schema) {
      schema.options.toJSON.baseUrl = options.baseUrl;
      schema.options.toJSON.apiBaseUrl = options.apiBaseUrl;
      schema.options.toJSON.proxyBaseUrl = options.proxyBaseUrl;
    });
    next();
  };
}
