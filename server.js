"use strict";

/**
 * Module dependencies.
 */

var express        = require('express'),
    popitApiApp    = require('popit-api'),
    config         = require('./config/general.json');

var app = express();

app.use(express.logger());
app.use(express.errorHandler());
app.use(express.favicon());

app.use('/api', popitApiApp({
  storageSelector: 'hostName'
}));

// redirect '/' to '/api'
app.get('/', function (req,res) {
  res.redirect('/api');
});

// 404 everything else that the API does not catch
app.all('*', function (req,res) {
  res.status(404).send('404 - Page not found.');
});


app.listen(config.serverPort);
