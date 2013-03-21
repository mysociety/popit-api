# PopIt API

[![Build Status](https://travis-ci.org/mysociety/popit-api.png?branch=master)](https://travis-ci.org/mysociety/popit-api)
[![Dependency Status](https://gemnasium.com/mysociety/popit-api.png)](https://gemnasium.com/mysociety/popit-api)

The API specific part of the [PopIt](http://popit.mysociety.org/) project.
Provides read and write access to the data and manages where it is stored. Will
be [Popolo](http://popoloproject.com/) compliant.

Can be used as a standalone server, or embedded in a
[Express](http://expressjs.com/) backed website.

## WARNING - Alpha code

This is alpha code and subject to frequent and backwards incompatible change.
Feel free to experiment but do not use in production until this message is
removed.

The exact implementation of the [Popolo](http://popoloproject.com/) standard
used here may not be fully up to date, or may contain discrepencies to the
official one. We ([mySociety](http://www.mysociety.org/)) are using this project
to help develop the standard in the light of requirements from our own projects.
The eventual aim is to be Popolo compliant.

## Installation

``` bash
npm install popit-api
```

## Overview

``` javascript
var express = require('express'),
    apiApp  = require('popit-api');

// Some minimal config is required
var apiConfig = {
  databaseName: 'some-name',
};

// Create the Express app, mount the PopIt api app at the appropriate path and
// start to listen.
var app = express();
app.use('/api', apiApp(apiConfig));
app.listen(3000);
```

You should then be able to go to http://127.0.0.1:3000/api/persons to list all
people (which will not be any initially as the database is empty).

This app provides a REST interface to an API that lets you store
[Popolo](http://popoloproject.com/) compliant data. That's it.

It does not provide any logging or authentication etc. It is intended that you
will do the app that you use this module in. There is a test app included that
you can use to experiment quickly. These commands will get you a dev environment
set up:

``` bash
git clone https://github.com/mysociety/popit-api.git
cd popit-api
npm install .
npm test
node test-server.js
open http://0.0.0.0:3000
```

## Configuration

All configuration is done by passing in the config to the app.

## Validation

All data written to the REST API is validated against the schemas stored in
`schemas/popolo`. Local copies are used rather than fetching over http so that
changes can be easily made and experimented with. Note that these schemas may be
different to the current official ones until the standard is finalised.
