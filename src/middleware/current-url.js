"use strict";

var url = require('url');

function currentUrl(baseUrl) {
  return function currentUrlMiddleware(req, res, next) {
    if (!baseUrl) {
      return next();
    }
    var parsedUrl = url.parse(baseUrl);
    parsedUrl.pathname = url.parse(req.originalUrl).pathname;
    parsedUrl.query = req.query;
    req.currentUrl = url.format(parsedUrl);
    next();
  };
}

module.exports = currentUrl;
