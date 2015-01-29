"use strict";

/**
 * Mongoose middleware providing elasticsearch indexing and searching for
 * models.
 *
 * Uses the database name as the index and the model name as the type when
 * indexing documents in elasticsearch. This can be configured by overriding
 * the `indexName` and/or `typeName` methods.
 */

var elasticsearch = require('elasticsearch');
var esFilter = require('../esfilter')().esFilter;
var esResolveFilter = require('../esfilter')().esResolveFilter;
var paginate = require('../paginate');
var i18n = require('../i18n');
var async = require('async');
var util = require('util');
var moment = require('moment');
var unorm = require('unorm');


module.exports = exports = elasticsearchPlugin;

function InvalidQueryError(message, explanation) {
  this.name = 'InvalidQueryError';
  this.message = message || "Invalid q parameter";
  this.explaination = explanation;
}
util.inherits(InvalidQueryError, Error);

exports.InvalidQueryError = InvalidQueryError;

var client = elasticsearchPlugin.client = new elasticsearch.Client({
  apiVersion: '0.90'
});

function elasticsearchPlugin(schema) {

  /**
   * Convert the document into a format suitable for indexing in
   * Elasticsearch. This uses the toJSON transform option to remove
   * fields we don't want to index.
   *
   * TODO: Make this more generalised rather than hard-coding memberships
   */
  schema.methods.toElasticsearch = function toElasticsearch(callback) {
    process.nextTick(function() {
      var doc = this.toJSON({
        transform: esFilter,
        fields: {
          all: {
            memberships: false,
            url: false,
            html_url: false
          }
        }
      });
      callback(null, i18n(doc, [], schema.options.toJSON.defaultLanguage || 'en', true));
    }.bind(this));
  };

  schema.methods.toESResolveIndex = function toESResolveIndex(callback) {
    process.nextTick(function() {
      var self = this;
      this.populateMemberships(function(err) {
        if (err) {
          callback(err);
        }
        var doc = self.toJSON({
          transform: esResolveFilter,
          fields: {
            all: {
              url: false,
              html_url: false
            }
          }
        });
        callback(null, i18n(doc, [], schema.options.toJSON.defaultLanguage || 'en', true));
      });
    }.bind(this));
  };

  schema.methods.reIndex = function reIndex(callback) {
    callback = callback || function() {};
    var self = this;
    self.toElasticsearch(function(err, result) {
      if (err) {
        throw err;
      }
      client.index({
        index: self.constructor.indexName(),
        type: self.constructor.typeName(),
        id: result.id,
        body: result
      }, function(err) {
        self.emit('es-indexed', err);
        callback(err);
      });
    });
  };

  schema.methods.resolveIndex = function resolveIndex(callback) {
    callback = callback || function() {};
    var self = this;
    self.toESResolveIndex(function(err, result) {
      if (err) {
        throw err;
      }
      // get name variations, create an index entry for each one.
      // need to work out how to do the ID bit though so they are
      // overwritten correctly
      var variations = result.name_variations;
      if ( !variations ) {
        return callback();
      }
      async.each(variations, function(name, done) {
        var local_result = result;
        var name_id = name.replace(/\s+/, '');
        local_result.alt_name = name;
        client.index({
          index: self.constructor.indexName() + '_resolve',
          type: self.constructor.typeName(),
          id: result.id + '_' + name_id,
          body: local_result
        }, function(err) {
          done(err);
        });
      }, function(err) { self.emit('es-resolve-indexed', err); callback(err); });
    });
  };

  /*
   * Undo the date munging we do for search convenience.
   */
  schema.methods.correctDates = function correctDates(callback) {
    callback = callback || function() {};
    var self = this;

    ['start_date', 'birth_date', 'founding_date','end_date', 'death_date', 'dissolution_date'].forEach(function(field) {
      var missing = field + '_missing';
      if ( self.get(missing) ) {
        self.set(missing, undefined);
        self.set(field, undefined);
      }
    });

    var memberships = self.get('memberships');
    if ( memberships ) {
      memberships = memberships.map( function(membership) {
        ['start_date', 'end_date'].forEach(function(field) {
          var missing = field + '_missing';
          if ( membership[missing] ) {
            membership[missing] = undefined;
            membership[field] = undefined;
          }
        });
        return membership;
      });
      self.set('memberships', memberships);
    }

    callback();
  };

  schema.methods.removeAltNames = function removeAltNames(callback) {
    callback = callback || function() {};
    var self = this;

    self.set('alt_name', undefined);
    self.set('name_variations', undefined);
    callback();
  };

  /**
   * After the document has been saved, index it in elasticsearch.
   */
  schema.post('save', function(doc) {
    doc.reIndex(function(err) {
      if (err) {
        console.warn(err);
      }
      if ( doc.constructor.typeName() == 'person' ) {
        doc.resolveIndex();
      }
    });
  });

  /**
   * After the document is removed, delete it from elasticsearch.
   */
  schema.post('remove', function(doc) {
    client.delete({
      index: doc.constructor.indexName(),
      type: doc.constructor.typeName(),
      id: doc.id
    }, function(err) {
      doc.emit('es-removed', err);
    });
  });

  /**
   * Configure the index name using the database name.
   */
  schema.statics.indexName = function() {
    return this.db.name.toLowerCase();
  };

  /**
   * Configure the type name using the model name.
   */
  schema.statics.typeName = function() {
    return this.modelName.toLowerCase();
  };

  /**
   * Add a search method to models that use this plugin.
   *
   * @param {Object} params An object containing search params
   * @param {String} params.q The elasticsearch query to perform
   * @param {String} params.page Page of results to return
   * @param {String} params.per_page Number of results per page
   * @param {Function} cb Function to call when search is complete
   */
  schema.statics.search = function(params, cb) {
    var skipLimit = paginate(params);

    var query = {
      index: this.indexName(),
      type: this.typeName(),
      q: params.q,
      from: skipLimit.skip,
      size: skipLimit.limit,
      explain: true
    };

    client.indices.validateQuery(query, function(err, res) {
      if (err) {
        return cb(err);
      }
      if (!res.valid) {
        var message = "Invalid q parameter: " + query.q;
        var error = new InvalidQueryError(message, res.explanations[0].error);
        return cb(error);
      }
      client.search(query, cb);
    });

  };

  schema.statics.resolve = function(params, cb) {
    var skipLimit = paginate(params);
    var criteria = [];
    // TODO: strip fullstops etc

    var name = params.name;
    name = name.toLowerCase();
    name = unorm.nfkd(name).replace(/[\u0300-\u036F]/g, '');

    var name_q;
    if ( name ) {
      name_q = { "multi_match": { "query": name, "fields": [ "alt_name", "other_names.name" ], "type": "phrase" } };
    }

    var q = {};
    var filtered;
    var today = moment().format('YYYY-MM-DD');
    var alive_on = today;
    if ( params.alive_on ) {
      alive_on = params.alive_on;
    }
    criteria.push( 'birth_date:<=' + alive_on + ' AND ' + 'death_date:>=' + alive_on );

    if ( params.org ) {
      var orgs = params.org.split('|');
      var org_queries = [];
      orgs.forEach(function(org) {
        var bool_criteria = [];
        bool_criteria.push({ "term": { "memberships.organization_id": org } });
        var org_date = today;
        if ( params.org_date ) {
          org_date = params.org_date;
        }
        bool_criteria.push({ "range": { "memberships.start_date": { "lte": org_date } } });
        bool_criteria.push({ "range": { "memberships.end_date": { "gte": org_date } } });
        org_queries.push({ "nested": { "path": "memberships", "filter": { "bool": { "must": bool_criteria } } } });
      });
      if ( org_queries.length > 1 ) {
        filtered = { "bool": { "must": org_queries } };
      } else {
        filtered = org_queries[0];
      }
    }
    if ( params.q ) {
      criteria.push(params.q);
    }

    var simple_q = { "simple_query_string": { "query": criteria.join(' AND ') } };
    q = { "bool": { "must": [ name_q, simple_q ] } };

    if ( filtered ) {
      q = { "filtered": { "query": q, "filter": filtered } };
    }

    q = { "query": q };

    var query = {
      index: this.indexName() + '_resolve',
      type: this.typeName(),
      body: q,
      from: skipLimit.skip,
      size: skipLimit.limit,
      explain: true
    };

    client.search(query, cb);
    /*
    client.indices.validateQuery(query, function(err, res) {
      if (err) {
        return cb(err);
      }
      if (!res.valid) {
        var message = "Invalid q parameter: " + query.body;
        var error = new InvalidQueryError(message, res.explanations[0].error);
        return cb(error);
      }
    });
   */

  };

  /**
   * Reindex all the documents in this collection using the elasticsearch
   * bulk API.
   */
  schema.statics.reIndex = function(done) {
    var self = this;
    self.find(function(err, docs) {
      if (err) {
        return done(err);
      }

      var indexed = 0;
      var body;

      async.concatSeries(docs, function(doc, callback) {
        doc.toElasticsearch(function(err, result) {
          if (err) {
            return callback(err);
          }
          indexed++;
          callback(null, [{
            index: {
              _index: self.indexName(),
              _type: self.typeName(),
              _id: doc._id,
            }
          }, result]);
        });
      }, function(err, results) {
        if (err) {
          return done(err);
        }
        body = results;

        if (body.length === 0) {
          return done(null, 0);
        }

        // Send the commands and content docs to the bulk API.
        // Set the requestTimeout to 5 minutes to hopefully prevent timeouts
        // for large collections.
        client.bulk({body: body, requestTimeout: 600000}, function(err) {
          done(err, indexed);
        });
      });
    });

  };

  schema.statics.reResolveIndex = function(done) {
    var self = this;
    self.find(function(err, docs) {
      if (err) {
        return done(err);
      }

      var indexed = 0;
      var body;

      async.concatSeries(docs, function(doc, callback) {
        doc.toESResolveIndex(function(err, result) {
          if (err) {
            return callback(err);
          }
          var variations = result.name_variations;
          async.concatSeries(variations, function(name, callback2) {
            indexed++;
            var local_result = result;
            var name_id = name.replace(/\s+/, '');
            local_result.alt_name = name;
            callback2(null, [{ index: {
              _index: self.indexName() + '_resolve',
              _type: self.typeName(),
              _id: result.id + '_' + name_id,
            }
            }, local_result]);
          }, function( err, results ) {
            callback(err, results);
          });
        });
      }, function(err, results) {
        if (err) {
          return done(err);
        }
        body = results;

        if (body.length === 0) {
          return done(null, 0);
        }

        // Send the commands and content docs to the bulk API.
        // Set the requestTimeout to 5 minutes to hopefully prevent timeouts
        // for large collections.
        client.bulk({body: body, requestTimeout: 600000}, function(err) {
          done(err, indexed);
        });
      });
    });

  };

  schema.statics.dropIndex = function dropIndex(done) {
    var indexName = this.indexName();
    client.indices.exists({
      index: indexName,
    }, function(err, exists) {
      if (err) {
        return done(err);
      }
      if (!exists) {
        return done();
      }
      client.indices.delete({
        index: indexName,
      }, done);
    });
  };

  schema.statics.bulkReIndex = function(docs, done) {
    var self = this;
    var indexed = 0;
    var body;
    async.concatSeries(docs, function(doc, callback) {
      doc.toElasticsearch(function(err, result) {
        if (err) {
          return callback(err);
        }
        indexed++;
        callback(null, [{
          index: {
            _index: self.indexName(),
            _type: self.typeName(),
            _id: doc._id,
          }
        }, result]);
      });
    }, function(err, results) {
      if (err) {
        return done(err);
      }
      body = results;

      if (body.length === 0) {
        return done(null, 0);
      }

      // Send the commands and content docs to the bulk API.
      // Set the requestTimeout to 5 minutes to hopefully prevent timeouts
      // for large collections.
      client.bulk({body: body, requestTimeout: 600000}, function(err) {
        done(err, indexed);
      });
    });
  };
}
