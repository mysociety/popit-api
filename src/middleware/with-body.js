"use strict";

module.exports = withBodyMiddleware;

/**
 * Adds a `withBody` method to the response object which won't wrap the
 * response in `result` if the `include_root` query parameter is `false`.
 */
function withBodyMiddleware(req, res, next) {
  res.withBody = function(status, body) {
    if (!body) {
      body = status;
      status = 200;
    }
    if (req.query.include_root === 'false') {
      res.status(status).jsonp(body);
    } else {
      res.status(status).jsonp({result: body});
    }
  };
  next();
}
