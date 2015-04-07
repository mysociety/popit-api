"use strict";

function dateFilterMiddleware(req, res, next) {
  if (!req.query.at) {
    return next();
  }
  var at = new Date(req.query.at);
  req.at = at;
  next();
}

module.exports = dateFilterMiddleware;
