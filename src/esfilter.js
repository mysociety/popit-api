"use strict";

var _ = require('underscore');
var filter = require('./filter');
var translate = require('./mongoose/json-transform').translateDoc;
var unorm = require('unorm');

module.exports = function esFilters() {
  return {
    esFilter: function esFilter(doc, ret, options) {
      if (!doc) {
        return;
      }

      ret = filter(doc, ret, options);

      return esFilterDatesOnly(doc, ret, options);
    },

    esTranslateFilter: function esTranslateFilter(doc, ret, options) {
      if (!doc) {
        return;
      }

      //converts _id -> id in organization which upsets test
      ret = filter(doc, ret, options);
      ret = translate(doc, ret, options);
      ret = esFilterDatesOnly(doc, ret, options);

      return ret;
    },

    esResolveFilter: function esResolveFilter(doc, ret, options) {
      if (!doc) {
        return;
      }

      //converts _id -> id in organization which upsets test
      ret = filter(doc, ret, options);
      ret = translate(doc, ret, options);
      ret = esFilterDatesOnly(doc, ret, options);
      ret = parseName(doc, ret, options);

      return ret;
    }
  };

  function transformImages(image) {
    // the default format images use makes automapping in Elastic Search
    // unhappy so change it to something ES can parse
    if (image.created && image.created.toISOString ) {
      image.created = image.created.toISOString();
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

      if ( field == 'memberships' && ret[field] ) {
        ret[field] = ret[field].map(function(membership) { return esFilterDatesOnly( membership, membership); } );
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

  function parseName(doc, ret, options) {
    var name = ret.name;

    // TODO: strip titles? full stops?

    if ( name ) {
      name = name.toLowerCase();
      name = unorm.nfkd(name).replace(/[\u0300-\u036F]/g, '');
      var parts = name.split(/\s+/);
      var variations = [name];
      var initials = parts.map(function(part) { return part.substr(0,1); });
      for ( var i = 0; i < parts.length; i++) {
        var variation = initials.slice(0,i+1).concat(parts.slice(i+1));
        variations.push(variation.join(' '));
      }
      var initials_together = initials.slice(0,-1).join('') + ' ' + parts.slice(-1);
      variations.push(initials_together);
      var family_first = parts.slice(-1).concat(parts.slice(0, -1)).join(' ');
      variations.push(family_first);
      ret.name_variations = variations;
    }
    return ret;
  }
};
