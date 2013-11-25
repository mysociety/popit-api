"use strict";

var crypto = require('crypto');

/**
 * Returns the name of the underlying database for the given slug.
 *
 * If the given slug is longer than the maxLength parameter (which defaults
 * to 63) then it will be shortened and have the md5 hash of the original
 * slug appended to it. This is necessary because mongo can only handle
 * database names < 64 characters long.
 *
 * @param {string} slug The slug to transform
 * @param {integer} [maxLength=63] Maximum length of a database name
 * @return {string} The database name for slug
 * @see https://github.com/mysociety/popit/issues/254
 * @public
 */
function slugToDatabase(slug, maxLength) {
  maxLength = maxLength || 63;
  if (slug.length > maxLength) {
    var slugHash = crypto.createHash('md5').update(slug).digest('hex');
    slug = slug.substr(0, (maxLength - slugHash.length - 1)) + '-' + slugHash;
  }
  return slug;
}

module.exports = slugToDatabase;
