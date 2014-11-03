"use strict";

var filter = require('./filter');

module.exports = esFilter;

function esFilter(doc, ret, options) {
  if (!doc) {
    return;
  }

  ret = filter(doc, ret, options);

  for (var field in ret) {
    if ( ['start_date', 'birth_date', 'founding_date'].indexOf(field) != -1 ) {
      if (!ret[field]) {
        var missing = field + '_missing';
        ret[field] = '0000-01-01';
        ret[missing] = true;
      }
    }

    if( ['end_date', 'death_date', 'dissolution_date'].indexOf(field) != -1 ) {
      if (!ret[field]) {
        var missing = field + '_missing';
        ret[field] = '9999-12-31';
        ret[missing] = true;
      }
    }
  }
  return ret;
}
