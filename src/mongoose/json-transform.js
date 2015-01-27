"use strict";

var filter = require('../filter');
var i18n = require('../i18n');

module.exports.jsonTransformPlugin = jsonTransformPlugin;
module.exports.translateDoc = translateDoc;

function jsonTransformPlugin(schema) {
  schema.set('toJSON', {transform: filterFields});
}

/**
 * Transform a document to a json doc.
 *
 * - options.fieldSpec The fields to show/hide
 */
function filterFields(doc, ret, options) {
  ret = filter(doc, ret, options);
  ret = translateDoc(doc, ret, options);
  ret = filterDates(doc, ret, options);
  ret = setImage(doc, ret, options);
  return ret;
}

function filterDates(doc, ret, options) {
  if (!options.at) {
    return ret;
  }

  function checkDates(field) {
    if (!field.start_date && !field.end_date) {
      return true;
    }
    var start = new Date(field.start_date);
    var end = new Date(field.end_date);
    var at = options.at;

    return start < at && (!field.end_date || end > at);
  }

  if (doc.other_names) {
    ret.other_names = doc.other_names.filter(checkDates);
  }

  if (doc.memberships) {
    ret.memberships = doc.memberships.filter(checkDates);
  }

  return ret;
}

function translateDoc(doc, ret, options) {
  if (options.returnAllTranslations) {
    return ret;
  }
  return i18n(ret, options.langs, options.defaultLanguage, options.includeTranslations);
}


function _generateUrl(parts) {
  var url = parts.join('/');

  // this is a bit grim but there doesn't seem to be a JS
  // library to do this.
  var reDoubleSlash = /([^:])\/\//g;
  url = url.replace(reDoubleSlash, "$1/");

  return url;
}


function generateImageUrl(img, doc, options) {
  var parts = [
    options.baseUrl,
    doc.constructor.collection.name.toLowerCase(),
    doc._id || doc.id,
    'image',
    img._id
  ];

  return _generateUrl(parts);
}

function generateImageProxyUrl(img, doc, options) {
  var parts = [
    options.proxyBaseUrl,
    encodeURIComponent(img.url),
  ];

  return _generateUrl(parts);
}

function setImage(doc, ret, options) {
  var images = ret.images;

  if ( images && images.length ) {
    ret.images = [];
    doc.get('images').forEach(function imageProcess(img) {
      if (!img.url) {
        img.url = generateImageUrl(img, doc, options);
      }
      if (options.proxyBaseUrl && !img.proxy_url) {
        img.proxy_url = generateImageProxyUrl(img, doc, options);
      }
      ret.images.push(img);
    });
    ret.image = ret.images[0].url;
    if ( options.proxyBaseUrl ) {
      ret.proxy_image = ret.images[0].proxy_url;
    }
  }

  return ret;
}
