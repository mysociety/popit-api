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

module.exports = elasticsearchPlugin;

var client = elasticsearchPlugin.client = new elasticsearch.Client();

function elasticsearchPlugin(schema) {

  /**
   * After the document has been saved, index it in elasticsearch.
   */
  schema.post('save', function(next) {
    client.index({
      index: this.constructor.indexName(),
      type: this.constructor.typeName(),
      id: this.id,
      body: this.toJSON()
    }, next);
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
   * This takes params that are passed through to elasticsearch directly,
   * if no index is given then it defaults to the models indexName method.
   */
  schema.statics.search = function(params, cb) {
    params.index = params.index || this.indexName();
    params.type = params.type || this.typeName();
    client.search(params, cb);
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

      var body = [];

      docs.forEach(function(doc) {
        // The bulk index API expects a command doc, then a content doc and so on.
        body.push({
          index: {
            _index: self.indexName(),
            _type: self.typeName(),
            _id: doc.id,
          }
        });

        body.push(doc.toJSON());
      });

      // Send the commands and content docs to the bulk API.
      client.bulk({body: body}, done);
    });

  };
}
