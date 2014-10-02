"use strict";

var express = require('express');
var _ = require('underscore');
var mongoose = require('mongoose');
var packageJSON = require("../package");
var storageSelector = require('./middleware/storage-selector');
var authCheck = require('./middleware/auth-check');
var hiddenFields = require('./middleware/hidden-fields');
var validateBody = require('./middleware/validate-body');
var apiLinks = require('./middleware/api-links');
var reIndex = require('./reindex');
var paginate = require('./paginate');
var withBody = require('./middleware/with-body');
var currentUrl = require('./middleware/current-url');
var dateFilter = require('./middleware/date-filter');
var i18n = require('./middleware/i18n');
var accept = require('http-accept');
var models = require('./models');
var eachSchema = require('./utils').eachSchema;
var InvalidQueryError = require('./mongoose/elasticsearch').InvalidQueryError;

module.exports = popitApiApp;

// Expose the reIndex function so popit UI can use it.
popitApiApp.reIndex = reIndex;

function popitApiApp(options) {
  var app = express();

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

  app.use(express.bodyParser());

  app.use(storageSelector(options));

  if (options.apiKey) {
    app.use(authCheck(options.apiKey));
  }

  app.use(withBody);

  app.use(currentUrl(options.apiBaseUrl));

  app.use(dateFilter);
  app.use(accept);
  app.use(i18n(options.defaultLanguage));

  app.get('/', function (req, res) {
    res.jsonp({
      info: {
        databaseName: req.db.model('Hidden').db.name,
        version:      packageJSON.version,
      },
    });
  });


  /**
   * Check that the collection is in the allowed list, if it is then expose
   * it as req.collection.
   */
  app.param('collection', function (req, res, next, collection) {
    // If the collection exists, carry on.
    if (!models[collection]) {
      return res.status(404).jsonp({
        errors: ["collection '" + collection + "' not found"]
      });
    }

    req.model = models[collection];
    req.collection = req.db.model(models[collection].modelName);

    next();
  });

  /**
   * Handle hidden fields on collections.
   */
  app.param('collection', hiddenFields);
  app.param('collection', apiLinks(options));

  app.get('/search/:collection', function(req, res, next) {
    var pagination = paginate(req.query);
    req.collection.search(req.query, function(err, result) {
      if (err instanceof InvalidQueryError) {
        // Send a 400 error to indicate the client needs to alter their request
        return res.send(400, {errors: [err.message, err.explaination]});
      }
      if (err) {
        return next(err);
      }

      var docs = result.hits.hits.map(function(doc) {
        return new req.collection(doc._source);
      });

      var body = pagination.metadata(result.hits.total, req.currentUrl);
      body.result = docs;
      res.jsonp(body);
    });
  });

  app.get('/:collection', function (req, res, next) {
    var pagination = paginate(req.query);
    req.collection.find({}, null, pagination, function (err, docs) {
      if (err) {
        return next(err);
      }

      req.collection.count(function(err, count) {
        if (err) {
          return next(err);
        }
        var body = pagination.metadata(count, req.currentUrl);
        body.result = docs;
        res.jsonp(body);
      });
    });
  });

  app.get('/:collection/:id(*)/full', function (req, res, next) {
    var id = req.params.id;

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.jsonp(404, {errors: ["id '" + id + "' not found"]});
      }

      eachSchema(req.collection, function(schema) {
        schema.options.toJSON.returnAllTranslations = true;
      });

      res.withBody(doc);

      eachSchema(req.collection, function(schema) {
        schema.options.toJSON.returnAllTranslations = false;
      });
    });
  });

  function populateJoins(req, res, doc, opts) {
    var opt = opts.shift();
    if ( opt ) {
      req.collection.populate(doc, opt, function(err, out) {
        populateJoins(req, res, out, opts);
      });
    } else {
      res.withBody(doc);
    }
  }

  app.get('/:collection/:id(*)', function (req, res, next) {
    var id = req.params.id;
    var embed = req.query.embed;

    if ( typeof embed != 'undefined' && embed === "" ) {
      req.model.schema.set('skipMemberships', true);
    }

    var join_structure;
    if ( embed && embed != 'membership' ) {
      var target_re = /((?:membership.\w+)+)/g;
      var targets = [];
      var match;
      while ( targets.length < 3 && ( match = target_re.exec(embed) ) ) {
        targets.push(match[0]);
      }
      var target_map = {
        'membership.person': {
          path: 'memberships.person_id',
          model: 'Person',
          collection: 'persons'
        },
        'membership.organization': {
          path: 'memberships.organization_id',
          model: 'Organization',
          collection: 'organizations'
        }
      };

      if ( !_.all(targets, function(target) { return target_map[target]; }) ) {
        return res.send(400, {errors: ['not a valid embed type', 'embed must be one of membership.person or membership.organization']});
      }

      join_structure = [];
      var path = [];
      _.each(targets, function(target) {
        var this_map = target_map[target];
        path.push( this_map.path );
        join_structure.push({ path: path.join('.'), model: this_map.model, collection: this_map.collection });
      });
    }

    req.collection.findById(id)
      .exec(function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.jsonp(404, {errors: ["id '" + id + "' not found"]});
      }

      if ( join_structure ) {
        populateJoins(req, res, doc, join_structure);
      } else {
        res.withBody(doc);
        req.model.schema.set('skipMemberships', false);
      }
    });
  });

  app.delete('/:collection/:id(*)', function (req, res, next) {
    var id = req.params.id;

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.send(204);
      }
      doc.remove(function(err) {
        if (err) {
          return next(err);
        }
        res.send(204);
      });
    });
  });

  app.post('/:collection', validateBody, function (req, res, next) {
    var body = req.body;
    // if there's an image and no body.images then add one as the popit front end uses
    // that at the moment
    if ( body.image && !body.images ) {
      body.images = [ { url: body.image } ];
    }
    req.collection.create(body, function (err, doc) {
      if (err) {
        return next(err);
      }
      res.withBody(doc);
    });

  });


  app.put('/:collection/:id(*)', validateBody, function (req, res, next) {

    var id = req.params.id;
    var body = req.body;

    if (id !== body.id) {
      return res
        .status(400)
        .jsonp({
          errors: ["URL id and document id are different"]
        });

    }

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        doc = new req.collection();
      }
      delete body.__v;

      /* this is to make sure that the _id property is the same for things added via
       * the api and the front end. If not then elasticsearch doesn't index it as it
       * confuses it's auto mapping.
       */
      if ( body.images ) {
        var images = [];
        body.images.forEach( function(img) {
          if ( img._id ) {
            img._id = new mongoose.Types.ObjectId(img._id);
          }
          images.push(img);
        });
        body.images = images;
      }

      // if there's an image and no body.images then add one as the popit front end uses
      // that at the moment
      if ( body.image && !body.images ) {
        body.images = [ { url: body.image } ];
      }
      doc.set(body);
      doc.save(function(err) {
        if (err) {
          return next(err);
        }
        res.withBody(doc);
      });
    });

  });


  /*
    Anything else we should 400 for as it is probably an unsupported method.
  */
  app.all('*', function (req, res) {
    res.status(405).jsonp({errors: ["unsupported method"] });
  });

  return app;
}
