"use strict";

module.exports = apiLinksMiddleware;

/**
 * If the apiBaseUrl argument is given then configure the models to include
 * links in their output.
 *
 * @param {Object} options The options to configure this function
 * @param {String} options.baseUrl The url where the main app is located
 * @param {String} options.apiBaseUrl The url where the API is mounted
 * @return {Function} Express compatible middleware.
 */
function apiLinksMiddleware(options) {
  return function apiLinks(req, res, next) {
    var schema = req.collection.schema;
    if (options.baseUrl) {
      schema.options.toJSON.baseUrl = options.baseUrl;
    }
    if (options.apiBaseUrl) {
      schema.options.toJSON.apiBaseUrl = options.apiBaseUrl;
    }
    next();
  };
}
