"use strict";

var express = require('express');
var app = module.exports = express();
var master = require('./src/master');

var Instance = master.model('Instance');

app.param('instanceSlug', function(req, res, next, slug) {
  Instance.findOne({slug: slug}, function(err, instance) {
    if (err) {
      return next(err);
    }
    if (!instance) {
      return res.status(404).send({error: ["Could not find instance"]});
    }
    req.instance = instance;
    next();
  });
});

app.get('/instances/:instanceSlug/persons', function(req, res, next) {
  var connection = master.connectionForInstance(req.instance);
  var Person = connection.model('Person');
  Person.find(function(err, people) {
    if (err) {
      return next(err);
    }
    res.send(people);
  });
});

if (!module.parent) {
  var port = process.env.PORT || 3000;
  app.listen(port, function() {
    console.log("PopIt API listening on http://0.0.0.0:" + port);
  });
}
