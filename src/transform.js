"use strict";

function addLinks(doc, options) {
  if (doc.constructor.collection) {
    if (options.apiBaseUrl) {
      doc.set('url', [
        options.apiBaseUrl,
        doc.constructor.collection.name.toLowerCase(),
        doc._id || doc.id
      ].join('/'));
    }
    if (options.baseUrl && (doc._id || doc.id)) {
      doc.set('html_url', [
        options.baseUrl,
        doc.constructor.collection.name.toLowerCase(),
        doc._id || doc.id
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

function transform(doc, options) {
  doc = addLinks(doc, options);
  doc = setImage(doc, options);
  return doc;
}

module.exports = transform;
