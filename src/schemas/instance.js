"use strict";

var mongoose = require('mongoose');
var validator = require('validator');
var format = require('util').format;
var config = require('config');
var uniqueValidator = require('mongoose-unique-validator');

// Need to account for popit_prefix length in maximum length of slug
var maxSlugLength = 63 - config.get('mongodb.prefix').length;
var slugLengthError = format(
  'Instance slug must be between 4 and %s characters long',
  maxSlugLength
);

var InstanceSchema = mongoose.Schema({
  slug: {
    type: String,
    lowercase: true,
    trim: true,
    match: [new RegExp("^[a-z0-9][a-z0-9\-]{2," + (maxSlugLength-2) + "}[a-z0-9]$"), slugLengthError],
    required: 'Instance slug is required.',
    unique: true,
  },

  email: {
    type: String,
    required: 'Email address is required.',
    validate: [validator.isEmail, '`{VALUE}` is not a valid email address.'],
  },

  created_date: {
    type: Date,
    'default': Date.now
  },

  dbname: {
    type: String
  },

  status: {
    type: String,
    required: true,
    'default': 'pending',
    'enum': [
      'pending',   // has not been activated yet - db does not exist
      'active',    // created and available
      'suspended', // blocked for some reason
      'archived',  // has been archived due to lack of use
    ],
  },

});

InstanceSchema.plugin(uniqueValidator);

module.exports = InstanceSchema;
