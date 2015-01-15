"use strict";

var storageSelector = require('./middleware/storage-selector');
var authCheck = require('./middleware/auth-check');
var apiLinks = require('./middleware/api-links');
var withBody = require('./middleware/with-body');
var currentUrl = require('./middleware/current-url');
var dateFilter = require('./middleware/date-filter');
var i18n = require('./middleware/i18n');
var accept = require('http-accept');
var cors = require('cors');
var bodyParser = require('body-parser');
var multer = require('multer');

module.exports = function(app, options) {
  // Pretty print json in production as well as development
  app.set('json spaces', 2);

  // Expose globally fieldSpec option in the app config.
  app.set('fieldSpec', options.fieldSpec);

  // Clean up requests from tools like slumber that set the Content-Type but no body
  // eg https://github.com/dstufft/slumber/pull/32
  app.use( function (req, res, next) {
    if ( (req.method == "GET" || req.method == "DELETE" ) && req.headers['content-type'] === 'application/json' && !req.body ) {
      delete req.headers['content-type'];
    }
    next();
  });

  app.use( function (req, res, next) {
    req.options = options;
    next();
  });

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(multer());

  app.use(storageSelector(options));

  if (options.apiKey) {
    app.use(authCheck(options.apiKey));
  }

  app.use(withBody);

  app.use(currentUrl(options.apiBaseUrl));

  app.use(dateFilter);
  app.use(accept);
  app.use(i18n(options.defaultLanguage));
  app.use(apiLinks(options));

  app.get('*', cors());
};
