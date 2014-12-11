"use strict";

var express = require('express');
var mongoose = require('mongoose');
var packageJSON = require("../package");
var path = require('path');
var mkdirp = require('mkdirp');
var fs = require('fs-extra');
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
var async = require('async');
var cors = require('cors');
var InvalidEmbedError = require('./mongoose/embed').InvalidEmbedError;
var MergeConflictError = require('./mongoose/merge').MergeConflictError;
var exporter = require('./exporter');
var zlib = require('zlib');

module.exports = popitApiApp;

// Expose the reIndex function so popit UI can use it.
popitApiApp.reIndex = reIndex;

function popitApiApp(options) {
  var app = express();

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
  app.use(apiLinks(options));

  app.get('*', cors());

  app.get('/', function (req, res) {
    res.jsonp({
      info: {
        databaseName: req.db.model('Hidden').db.name,
        version:      packageJSON.version,
      },
    });
  });

  // Export all languages - can potentially produce invalid popolo
  app.get('/export.json', function(req, res, next) {
    exporter(req.db, function(err, exportObject) {
      if (err) {
        return next(err);
      }
      eachSchema(req.collection, function(schema) {
        schema.options.toJSON.returnAllTranslations = true;
      });
      res.send(exportObject);
      eachSchema(req.collection, function(schema) {
        schema.options.toJSON.returnAllTranslations = false;
      });
    });
  });

  app.get('/export.json.gz', function(req, res, next) {
    exporter(req.db, function(err, exportObject) {
      if (err) {
        return next(err);
      }
      var filename;
      if (options.instanceName) {
        filename = options.instanceName + '-popolo-export.json.gz';
      } else {
        filename = 'popolo-export.json.gz';
      }
      res.attachment(filename);
      var buf = new Buffer(JSON.stringify(exportObject), 'utf8');
      zlib.gzip(buf, function(err, result) {
        if (err) {
          return next(err);
        }
        res.end(result);
      });
    });
  });

  // Export an individual language, this should be valid popolo
  app.get('/export-:language.json', function(req, res, next) {
    exporter(req.db, function(err, exportObject) {
      if (err) {
        return next(err);
      }
      eachSchema(req.collection, function(schema) {
        schema.options.toJSON.langs = [req.params.language];
      });
      res.send(exportObject);
    });
  });

  // Export an individual language, this should be valid popolo
  app.get('/export-:language.json.gz', function(req, res, next) {
    exporter(req.db, function(err, exportObject) {
      if (err) {
        return next(err);
      }
      eachSchema(req.collection, function(schema) {
        schema.options.toJSON.langs = [req.params.language];
      });
      var filename;
      if (options.instanceName) {
        filename = options.instanceName + '-popolo-export-' + req.params.language + '.json.gz';
      } else {
        filename = 'popolo-export-' + req.params.language + '.json.gz';
      }
      res.attachment(filename);
      var buf = new Buffer(JSON.stringify(exportObject), 'utf8');
      zlib.gzip(buf, function(err, result) {
        if (err) {
          return next(err);
        }
        res.end(result);
      });
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

      async.each(docs, function(doc, done) {
        doc.embedDocuments(req.query.embed, function() {
          doc.correctDates(done);
        });
      }, function(err) {
        if (err) {
          return next(err);
        }

        var body = pagination.metadata(result.hits.total, req.currentUrl);
        body.result = docs;
        res.jsonp(body);
      });
    });
  });

  app.get('/:collection', function (req, res, next) {
    var pagination = paginate(req.query);
    req.collection.find({}, null, pagination, function (err, docs) {
      if (err) {
        return next(err);
      }

      async.each(docs, function(doc, done) {
        doc.embedDocuments(req.query.embed, done);
      }, function(err) {
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

  /**
   * Merge two people together.
   *
   * TODO Possibly make this work for any collection?
   */
  app.post('/:collection/:id/merge/:otherId', function(req, res, next) {
    var id = req.params.id;
    var otherId = req.params.otherId;
    if (req.params.collection !== 'persons') {
      return res.jsonp(400, {errors: ["The merge method currently only works with people"]});
    }
    if (id === otherId) {
      return res.jsonp(400, {errors: ["Can't merge a person into themselves"]});
    }
    async.map([id, otherId], req.collection.findById.bind(req.collection), function(err, results) {
      if (err) {
        return next(err);
      }
      var person = results[0];
      var otherPerson = results[1];
      if (!person) {
        return res.jsonp(404, {errors: ["id '" + id + "' not found"]});
      }
      if (!otherPerson) {
        return res.jsonp(404, {errors: ["id '" + otherId + "' not found"]});
      }
      person.merge(otherPerson, function(err) {
        if (err) {
          if (err instanceof MergeConflictError) {
            return res.send(400, {errors: [err.message].concat(err.conflicts)});
          }
          return next(err);
        }
        person.save(function(err) {
          if (err) {
            return next(err);
          }
          otherPerson.remove(function(err) {
            if (err) {
              return next(err);
            }
            res.withBody(person);
          });
        });
      });
    });
  });

  app.get('/:collection/:id(*)', function (req, res, next) {
    var id = req.params.id;

    req.collection.findById(id)
      .exec(function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.jsonp(404, {errors: ["id '" + id + "' not found"]});
      }

      doc.embedDocuments(req.query.embed, function(err) {
        if (err instanceof InvalidEmbedError) {
          // Send a 400 error to indicate the client needs to alter their request
          return res.send(400, {errors: [err.message, err.explaination]});
        }
        if (err) {
          return next(err);
        }
        res.withBody(doc);
      });
    });
  });

  app.delete('/:collection/:id/image', function (req, res, next) {
    var id = req.params.id;

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.send(204);
      }

      var images = doc.get('images');

      images.forEach(function(img) {
        if ( img._id ) {
          var image = new (req.popit.model('Image'))( img );
          var path = req.popit.files_dir( image.local_path );
          fs.removeSync( path );
        }
      });

      doc.set('image', null);
      doc.set('images', []);
      doc.markModified('images');
      doc.save(function(err, newDoc) {
        if (err) {
          return next(err);
        }

        return res.withBody(newDoc);
      });
    });
  });

  app.delete('/:collection/:id/image/:image_id', function (req, res, next) {
    var id = req.params.id;
    var image_id = req.params.image_id;

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if (!doc) {
        return res.send(204);
      }

      var images = doc.get('images');

      if ( !images ) {
        return res
          .status(400)
          .jsonp({
            errors: ["Doc has no images"]
          });
      }

      var imageIdx = getImageByIdx( image_id, images );

      if ( imageIdx == -1 ) {
        return res
          .status(400)
          .jsonp({
            errors: ["No image with that id found"]
          });
      }

      var image = new (req.popit.model('Image'))( images[imageIdx] );
      var imagePath = req.popit.files_dir( image.local_path );

      fs.remove( imagePath, function(err) {
        if (err) {
          throw err;
        }

        images.splice(imageIdx, 1);
        doc.set('images', images);
        doc.markModified('images');
        doc.save(function(err, newDoc) {
          if (err) {
            return next(err);
          }

          return res.withBody(newDoc);
        });
      });
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


  function saveImages( doc, image, upload, dest_path, res, next, idx ) {
    var options = {};
    if ( typeof idx != 'undefined' ) {
      options = { clobber: true };
    }
    fs.move( upload.path, dest_path, options, function(err) {
      if (err) {
        throw err;
      }

      var images = doc.get('images');
      if ( !images ) {
        images = [];
      }

      /* This whole process here is to make sure mongoose sees this as
       * JSON and not as a Mongoose document. If it does the latter then
       * there are various circular references in there that cause a stack
       * size exceeded error.
       *
       * Furthermore elasticsearch is fussy about date formats and the default
       * format that is produced when parsing the created date to JSON upsets
       * it so to be safe we force it to a known compatible
       * format here.
       */
      image = image.toJSON();
      image.created = image.created.toISOString();

      if ( typeof idx != 'undefined' ) {
        images[idx] = image;
      } else {
        images.push(image);
      }

      doc.set('images', images);
      // mongoose has trouble working out if mixed object arrays have changed
      // so make sure it knows otherwise the changes aren't saved
      doc.markModified('images');

      doc.save(function(err, newDoc) {
        if (err) {
          return next(err);
        }

        return res.withBody(newDoc);
      });
    });
  }

  function processImageBody( image, body ) {
    var fieldsToRemove = [ 'filename', 'name', 'content', 'id', '_id' ];
    fieldsToRemove.forEach(function(field) {
      delete body[field];
    });

    Object.keys(body).forEach(function(key) {
      image.set(key, body[key]);
    });

    return image;
  }

  app.post('/:collection/:id/image', function (req, res, next) {
    var id = req.params.id;
    var body = req.body;

    var upload = {};
    if ( req.files ) {
      upload = req.files.image || {};
    }

    if ( !upload.size ) {
      return res
        .status(400)
        .jsonp({
          errors: ["No image sent"]
        });
    }

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if ( !doc ) {
        return res
          .status(400)
          .jsonp({
            errors: ["No doc found"]
          });
      }

      var image = new (req.popit.model('Image'))({
          mime_type: upload.type
        });

      image = processImageBody( image, body );

      var dest_path = req.popit.files_dir( image.local_path );

      // copy the image to the right place
      mkdirp( path.dirname(dest_path), function (err) {
        if (err) {
          throw err;
        }
        saveImages( doc, image, upload, dest_path, res, next );
      });
    });
  });

  // this doesn't make sense to do and we have to handle it
  // explicitly otherwise documents with an id of :id/image
  // are created which is almost certainly not what people
  // want
  app.put('/:collection/:id/image', function (req, res) {
    res.status(405).jsonp({errors: ["unsupported method"] });
  });

  function getImageByIdx( idx, images ) {
    for ( var i = 0; i < images.length; i++ ) {
      if ( images[i]._id == idx ) {
        return i;
      }
    }

    return -1;
  }

  app.put('/:collection/:id/image/:image_id', function (req, res, next) {
    var id = req.params.id;
    var image_id = req.params.image_id;
    var body = req.body;

    var upload = {};
    if ( req.files ) {
      upload = req.files.image || {};
    }

    if ( !upload.size ) {
      return res
        .status(400)
        .jsonp({
          errors: ["No image sent"]
        });
    }

    req.collection.findById(id, function (err, doc) {
      if (err) {
        return next(err);
      }
      if ( !doc ) {
        return res
          .status(400)
          .jsonp({
            errors: ["No doc found"]
          });
      }

      var images = doc.get('images');

      if ( !images ) {
        return res
          .status(400)
          .jsonp({
            errors: ["Doc has no images"]
          });
      }

      var imageIdx = getImageByIdx( image_id, images );

      if ( imageIdx == -1 ) {
        return res
          .status(400)
          .jsonp({
            errors: ["No image with that id found"]
          });
      }

      var image = new (req.popit.model('Image'))( images[imageIdx] );

      image = processImageBody( image, body );

      var dest_path = req.popit.files_dir( image.local_path );

      saveImages( doc, image, upload, dest_path, res, next, imageIdx );
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
