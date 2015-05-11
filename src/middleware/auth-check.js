"use strict";

/**
 * Check to see if the user is authenticated.
 *
 * If the user has provided a valid api key we tell the storage mechanism
 * about it.
 *
 * @param {string} apiKey The api key for this server.
 * @return {function} The middleware that performs the check.
 */
function authCheck(apiKey) {
  return function(req, res, next) {
    req.isAdmin = false;
    if (req.query.apiKey === apiKey) {
      req.isAdmin = true;
    }
    next();
  };
}

module.exports = authCheck;
