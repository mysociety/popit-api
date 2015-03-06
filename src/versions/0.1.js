"use strict";

var express = require('express');
var reIndex = require('../reindex');

module.exports = popitApiApp;

// Expose the reIndex function so popit UI can use it.
popitApiApp.reIndex = reIndex;

function popitApiApp(options) {
  var app = express();

  require('../app-setup')(app, options);


  require('../routes/info')(app, options);
  require('../routes/export')(app);
  require('../routes/import')(app, options);
  require('../routes/collection.param')(app);
  require('../routes/search')(app);
  require('../routes/collection.get')(app);
  require('../routes/collection.post')(app);
  require('../routes/merge')(app);
  require('../routes/image')(app);
  require('../routes/document.get')(app);
  require('../routes/document.delete')(app);
  require('../routes/document.put')(app);
  require('../routes/delete')(app);

  // Error handling
  app.use(function(err, req, res, next) {
    // This should always be an error, but jshint complains if we don't use all
    // arguments and express will only interpret this as an error handler if
    // the arity is 4.
    if (!err) {
      return next();
    }
    console.error(err.stack);
    res.status(500).send({errors: ["Something went wrong", err.message]});
  });

  /*
    Anything else we should 400 for as it is probably an unsupported method.
  */
  app.all('*', function (req, res) {
    res.status(405).jsonp({errors: ["unsupported method"] });
  });

  return app;
}
