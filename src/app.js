"use strict";

var express = require('express');
var _ = require('underscore');
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
var InvalidEmbedError = require('./mongoose/embed').InvalidEmbedError;
var MergeConflictError = require('./mongoose/merge').MergeConflictError;

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

  function removeMemberships(memberships, callback) {
    async.each(memberships, function deleteMembership(membership, done) {
      membership.remove(done);
    }, function (err) {
      callback(err);
    });
  }

  function restoreMemberships(req, memberships, callback) {
    var Membership = req.db.model(models.memberships.modelName);
    async.each(memberships, function restoreMembership(membership, done) {
      Membership.findById(membership.id, function(err, mem) {
        if (mem) {
          mem.set(membership);
          mem.save(function(err) {
            if (err) {
              return done(err);
            }
            return done();
          });
        } else {
          membership._id = membership.id;
          Membership.create(membership, function (err, mem) {
            if ( err ) {
              return done(err);
            }
            done(null, mem);
          });
        }
      });
    }, function (err) {
      callback(err);
    });
  }

  function tidyUpInlineMembershipError(req, doc, created, updated, callback) {
    if (doc) {
      doc.remove(function(err) {
        if (err) {
          return callback(err);
        }
        removeMemberships(created, callback);
      });
    } else {
      removeMemberships(created, function (err) {
        if (err) {
          return callback(err);
        }
        restoreMemberships(req, updated, callback);
      });
    }
  }

  function checkMembership(req, membership, doc, done) {
    if ( req.model.modelName == 'Person' ) {
      if ( !membership.person_id ) {
        membership.person_id = doc.id;
      } else if ( membership.person_id != doc.id ) {
        return done("person id (" + membership.person_id + ") in membership and person id (" + doc.id + ") are mismatched");
      }
    } else if ( req.model.modelName == 'Organization' ) {
      if ( !membership.organization_id ) {
        membership.organization_id = doc.id;
      } else if ( membership.organization_id != doc.id ) {
        return done("organization id (" + membership.organization_id + ") in membership and organization id (" + doc.id + ") are mismatched");
      }
    } else if ( req.model.modelName == 'Post' ) {
      if ( !membership.post_id ) {
        membership.post_id = doc.id;
      } else if ( membership.post_id != doc.id ) {
        return done("post id (" + membership.post_id + ") in membership and post id (" + doc.id + ") are mismatched");
      }
    }
    return done(null, membership);
  }

  function createMembership(req, membership, done) {
    if ( !membership.id ) {
      var id = new mongoose.Types.ObjectId();
      membership.id = id.toHexString();
    }
    membership._id = membership.id;
    var Membership = req.db.model(models.memberships.modelName);
    Membership.create(membership, function (err, mem) {
      if ( err ) {
        return done(err);
      }
      done(null, mem);
    });
  }

  function processMembership(membership, req, doc, done) {
    var existing = false;
    var Membership = req.db.model(models.memberships.modelName);
    async.waterfall([
      function callCheckMembership(cb) {
        checkMembership(req, membership, doc, cb);
      },
      function callCreateMembership(membership, cb) {
        if ( ! membership.id ) {
          createMembership(req, membership, function(err, membership) {
            if ( err ) {
              return cb(err);
            }
            req.created_memberships.push(membership);
            cb();
          });
        } else {
          Membership.findById(membership.id, function(err, mem) {
            if (mem) {
              existing = true;
              req.updated_memberships.push(mem.toJSON());
              mem.set(membership);
              mem.save(function(err) {
                if (err) {
                  return cb(err);
                }
                return cb();
              });
            } else {
              createMembership(req, membership, function(err, membership) {
                if ( err ) {
                  return cb(err);
                }
                req.created_memberships.push(membership);
                cb();
              });
            }
          });
        }
      }], function membershipCreated(err) {
        if (err) {
          return done(err);
        }
        done();
      });
  }

  app.post('/:collection', validateBody, function (req, res, next) {
    var body = req.body;
    // if there's an image and no body.images then add one as the popit front end uses
    // that at the moment
    if ( body.image && !body.images ) {
      body.images = [ { url: body.image } ];
    }

    var memberships = body.memberships;
    req.created_memberships = [];
    req.updated_memberships = [];
    delete body.memberships;
    req.collection.create(body, function (err, doc) {
      if (err) {
        return next(err);
      }
      if ( memberships ) {
        // we do this in series otherwise if there's an error we might not
        // have recorded all the memberships created and hence can't
        // undo things correctly
        async.eachSeries(memberships, function callProcessMembership(membership, done) {
            processMembership(membership, req, doc, done);
          }, function afterCreateMemberships(err) {
          if (err) {
            tidyUpInlineMembershipError(req, doc, req.created_memberships, null, function(innerErr) {
              if ( innerErr ) {
                return res.send(400, {errors: [innerErr]});
              }
              return res.send(400, {errors: [err]});
            });
          } else {
            doc.populateMemberships( function (err) {
              if (err) {
                tidyUpInlineMembershipError(req, doc, req.created_memberships, null, function(err) {
                  return res.send(400, {errors: [err]});
                });
              } else {
                res.withBody(doc);
              }
            });
          }
        });
      } else {
        res.withBody(doc);
      }
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

  function removeOldMemberships(req, memberships, key, id, done) {
    var membership_ids =
      _.chain(memberships)
       .map( function(membership) { return membership.id; })
       .compact()
       .value();

    var Membership = req.db.model(models.memberships.modelName);
    var criteria = {};
    criteria[key] = id;
    var removed = [];
    Membership
      .find( criteria )
      .where( '_id' ).nin( membership_ids )
      .exec( function( err, memberships ) {
        if ( err ) {
          return done(err);
        }
        async.forEachSeries(memberships, function(membership, done) {
          removed.push(membership.toJSON());
          membership.remove(done);
        }, function (err) {
          if (err) {
            return done(err);
          }
          done(null, removed);
        });
      });
  }

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
      var memberships = body.memberships;
      var key = req.collection.modelName.toLowerCase() + '_id';
      req.created_memberships = [];
      req.updated_memberships = [];
      delete body.memberships;
      if ( memberships ) {
        // we do this in series otherwise if there's an error we might not
        // have recorded all the memberships created/updated and hence can't
        // undo things correctly
        async.eachSeries(memberships, function callProcessMembership(membership, done) {
            processMembership(membership, req, doc, done);
          }, function afterCreateMemberships(err) {
          if (err) {
            tidyUpInlineMembershipError(req, null, req.created_memberships, req.updated_memberships, function(innerErr) {
              if ( innerErr ) {
                return res.send(400, {errors: [innerErr]});
              }
              return res.send(400, {errors: [err]});
            });
            return;
          }
          removeOldMemberships(req, memberships, key, doc.id, function(err, removed) {
            if (err) {
              return next(err);
            }
            req.updated_memberships = req.updated_memberships.concat(removed);
            doc.set(body);
            doc.save(function(err) {
              if (err) {
                tidyUpInlineMembershipError(req, null, req.created_memberships, req.updated_memberships, function(innerErr) {
                  if ( innerErr ) {
                    return res.send(400, {errors: [innerErr]});
                  }
                  return res.send(400, {errors: [err]});
                });
                return;
              }
              doc.populateMemberships( function(err) {
                if (err) {
                  return next(err);
                }
                res.withBody(doc);
              });
            });
          });
        });
      } else {
        doc.set(body);
        doc.save(function(err) {
          if (err) {
            return next(err);
          }
          res.withBody(doc);
        });
      }
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
