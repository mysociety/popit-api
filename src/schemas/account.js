"use strict";

var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
var validator = require('validator');
var crypto = require('crypto');
var uniqueValidator = require('mongoose-unique-validator');

var AccountSchema = new mongoose.Schema({

  email: {
    type: String,
    required: 'Email is required.',
    unique: 'There is already an account for {VALUE}',
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, '`{VALUE}` is not a valid email address.'],
  },

  name: {
    type: String,
    required: 'Name is required.',
  },

  resetPasswordToken: String,

  resetPasswordExpires: Date,

  apikey: String,

});

AccountSchema.plugin(passportLocalMongoose, {
  usernameField: 'email',
});

AccountSchema.methods.setResetPasswordToken = function setResetPasswordToken(callback) {
  var account = this;
  crypto.randomBytes(20, function(err, buffer) {
    if (err) {
      return callback(err);
    }
    var token = buffer.toString('hex');
    account.resetPasswordToken = token;
    account.resetPasswordExpires = Date.now() + (60 * 60 * 24 * 1000); // 24 hours
    account.save(function(err) {
      callback(err, token);
    });
  });
};

AccountSchema.methods.setAPIKey = function setAPIKey(callback) {
  var account = this;
  crypto.randomBytes(20, function(err, buffer) {
    if (err) {
      return callback(err);
    }
    var token = buffer.toString('hex');
    account.apikey = token;
    account.save(function(err) {
      callback(err, token);
    });
  });
};

AccountSchema.methods.removeAPIKey = function removeAPIKey(callback) {
  var account = this;
  account.apikey = null;
  account.save(callback);
};

AccountSchema.plugin(uniqueValidator);

module.exports = AccountSchema;
