"use strict";

var url = require('url');

module.exports = paginate;

/**
 * Turns page/per_page parameters into mongo-friendly skip/limit parameters.
 *
 * @param {Object} [options]
 * @param {Integer} [options.page=1] Page of results to display
 * @param {Integer} [options.per_page=30] Number of results per page
 * @return {Object}
 */
function paginate(options) {
  options = options || {};
  var page = parseInt(options.page, 10) || 1;
  var perPage = parseInt(options.per_page, 10) || 30;

  if (page < 1 || page > 1000) {
    page = 1;
  }

  if (perPage < 1 || perPage > 200) {
    perPage = 30;
  }

  var skip = (page - 1) * perPage;
  var limit = perPage;

  function metadata(total, currentUrl) {
    var hasMore = (skip + limit) < total;
    var body = {
      total: total,
      page: page,
      per_page: perPage,
      has_more: hasMore
    };

    if (currentUrl) {
      var parsedUrl = url.parse(currentUrl, true);
      delete parsedUrl.search;
      var currentPerPage = parsedUrl.query.per_page;

      parsedUrl.query = {};

      if (currentPerPage) {
        parsedUrl.query.per_page = currentPerPage;
      }

      if (hasMore) {
        parsedUrl.query.page = (page + 1);
        body.next_url = url.format(parsedUrl);
      }

      if (page > 1) {
        parsedUrl.query.page = (page - 1);
        body.prev_url = url.format(parsedUrl);
      }
    }

    return body;
  }

  return {
    metadata: metadata,
    skip: skip,
    limit: limit
  };
}
