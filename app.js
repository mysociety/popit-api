"use strict";

var express = require('express');
var app = express();
var db = require('./db');

var Instance = db.model('Instance');

app.get('/instances', function(req, res, next) {
  Instance.find(function(err, instances) {
    if (err) {
      return next(err);
    }
    res.send(instances);
  });
});

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

app.get('/instances/:instanceSlug', function(req, res) {
  res.send(req.instance);
});

app.get('/instances/:instanceSlug/persons', function(req, res, next) {
  var connection = db.connectionForInstance(req.instance);
  var Person = connection.model('Person');
  Person.find(function(err, people) {
    if (err) {
      return next(err);
    }
    res.send(people);
  });
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("PopIt API listening on http://0.0.0.0:" + port);
});
