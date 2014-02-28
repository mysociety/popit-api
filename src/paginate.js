"use strict";

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

  if (perPage < 1 || perPage > 100) {
    perPage = 30;
  }

  var skip = (page - 1) * perPage;
  var limit = perPage;

  return {
    page: page,
    skip: skip,
    limit: limit
  };
}
