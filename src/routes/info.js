"use strict";

var packageJSON = require("../../package");

module.exports = function(app, options) {
  app.get('/', function (req, res) {
    var baseUrl = options.apiBaseUrl ? options.apiBaseUrl : '';
    var proxyBaseUrl = options.proxyBaseUrl ? options.proxyBaseUrl : '';
    res.jsonp({
      note: "This is the API entry point - use a '*_api_url' link in 'meta' to search a collection.",
      info: {
        databaseName: req.db.model('Hidden').db.name,
        version:      packageJSON.version,
      },
      meta: {
        persons_api_url: baseUrl + '/persons',
        organizations_api_url: baseUrl + '/organizations',
        memberships_api_url: baseUrl + '/memberships',
        posts_api_url: baseUrl + '/posts',
        image_proxy_url: proxyBaseUrl
      },
    });
  });
};
