"use strict";

var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var PermissionsSchema = new mongoose.Schema({

    account: {
        type: ObjectId,
        ref: 'Account',
        required: 'Permissions require an {PATH}',
    },

    instance: {
        type: ObjectId,
        ref: 'Instance',
        required: 'Permissions require an {PATH}',
    },

    role: {
      type: String,
      required: 'Permissions require a {PATH}',
      enum: {
        values: ['owner', 'editor'],
        message: 'Permission role must be either owner or editor',
      },
    },

});

module.exports = PermissionsSchema;
