"use strict";

var i18n = require('../src/i18n');
var assert = require('assert');

describe("internationalization", function() {
  var json = {
    name: {
      en: 'Chris',
      ru: 'Крис'
    }
  };

  it("converts translated documents to popolo", function() {
    assert.equal(i18n(json, 'en').name, 'Chris');
    assert.equal(i18n(json, 'ru').name, 'Крис');
  });

  it("uses the default language when there is no match", function() {
    assert.equal(i18n(json, 'es', 'en').name, 'Chris');
    assert.equal(i18n(json, 'es', 'ru').name, 'Крис');
  });

  it("returns an empty string when no languages match", function() {
    assert.equal(i18n(json, 'es', 'de').name, '');
  });
});
