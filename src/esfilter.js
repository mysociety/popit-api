"use strict";

var _ = require('underscore');
var filter = require('./filter');


module.exports = function esFilters() {
  return {
    esFilter: function esFilter(doc, ret, options) {
      if (!doc) {
        return;
      }

      ret = filter(doc, ret, options);

      return esFilterDatesOnly(doc, ret, options);
    },

    esFilterDatesOnly: esFilterDatesOnly,
  };

  function transformImages(image) {
    // the default format images use makes automapping in Elastic Search
    // unhappy so change it to something ES can parse
    if (image.created && image.created.toISOString ) {
      image.created = image.created.toISOString();
    } else {
      delete image.created;
    }
    // don't save the mongo ObjectID, save the id
    if (image._id && image._id.toString) {
      image._id = image._id.toString();
    }

    return image;
  }

  function esFilterDatesOnly(doc, ret) {
    var missing = '';
    for (var field in ret) {
      if ( ['start_date', 'birth_date', 'founding_date', 'created_at', 'updated_at', 'valid_from'].indexOf(field) != -1 ) {
        if (!ret[field]) {
          missing = field + '_missing';
          ret[field] = '0000-01-01';
          ret[missing] = true;
        }
      }

      if ( ['end_date', 'death_date', 'dissolution_date', 'valid_until'].indexOf(field) != -1 ) {
        if (!ret[field]) {
          missing = field + '_missing';
          ret[field] = '9999-12-31';
          ret[missing] = true;
        }
      }

      // these also contain dates so we need to process them
      if ( field == 'contact_details' || field == 'other_names' ) {
        ret[field] = esFilterDatesOnly(ret[field], ret[field]);
      }

      if ( field == 'images' && _.isArray(ret.images) && ret.images.length > 0 ) {
        var images = ret.images;
        var new_images = images.map(transformImages);

        if ( new_images.length ) {
          ret.images = new_images;
        } else {
          ret.images = undefined;
        }
      }
    }
    return ret;
  }
};
