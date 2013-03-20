"use strict";

var CONFIG = require('config');

/*
  These are default config values for this module. See
  http://lorenwest.github.com/node-config/latest/Config.html#method_setModuleDefaults
  for how changes ca be made.
*/

CONFIG.setModuleDefaults(
  "popit-api",
  {
    database: {
      name: 'test-popit-api-db',
    },
  }
);

module.exports = CONFIG;
