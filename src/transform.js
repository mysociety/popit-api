"use strict";

var i18n = require('./i18n');

function addLinks(doc, options) {
  if (doc.constructor.collection) {
    if (options.apiBaseUrl) {
      doc.set('url', [
        options.apiBaseUrl,
        doc.constructor.collection.name.toLowerCase(),
        encodeURIComponent(doc._id || doc.id),
      ].join('/'));
    }
    if (options.baseUrl && (doc._id || doc.id)) {
      doc.set('html_url', [
        options.baseUrl,
        doc.constructor.collection.name.toLowerCase(),
        encodeURIComponent(doc._id || doc.id),
      ].join('/'));
    }
  }
  return doc;
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

function setImage(doc, options) {
  var images = doc.get('images');
  if (!images || images.length === 0) {
    return doc;
  }
  images.forEach(function imageProcess(img) {
    if (!img.url) {
      img.set('url', generateImageUrl(img, doc, options));
    }
    if (options.proxyBaseUrl && !img.proxy_url) {
      img.set('proxy_url', generateImageProxyUrl(img, doc, options));
    }
  });
  doc.set('image', images[0].url);
  if ( options.proxyBaseUrl ) {
    doc.set('proxy_image', images[0].get('proxy_url'));
  }

  return doc;
}

function filterDates(doc, options) {
  if (!options.at) {
    return doc;
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
    doc.other_names = doc.other_names.filter(checkDates);
  }

  if (doc.memberships) {
    doc.memberships = doc.memberships.filter(checkDates);
    doc.memberships = doc.memberships.filter(function(membership) {
      if (membership.legislature) {
        return checkDates(membership.legislature);
      } else {
        return true;
      }
    });
  }

  return doc;
}

function translateDoc(doc, options) {
  if (options.returnAllTranslations) {
    return doc;
  }
  return i18n(doc.toJSON(), options.langs, options.defaultLanguage, options.includeTranslations);
}

function hiddenFields(doc, options) {
  var fields = options.hiddenFields || {};
  var newDoc = {};
  for (var field in doc) {
    // Skip any fields that have been hidden on this doc.
    if (fields[doc.id]) {
      var value = fields[doc.id][field];
      if (value === false) {
        continue;
      }
    }
    // Skip any fields that have been hidden for all docs.
    if (fields.all && fields.all[field] === false) {
      continue;
    }
    // If we've made it this far then copy the field to the new doc.
    newDoc[field] = doc[field];
  }
  return newDoc;
}

function transform(doc, options) {
  doc = addLinks(doc, options);
  doc = setImage(doc, options);
  doc = filterDates(doc, options);
  doc = translateDoc(doc, options);
  doc = hiddenFields(doc, options);
  return doc;
}

module.exports = transform;
