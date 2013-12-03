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
used here may not be fully up to date, or may contain discrepancies to the
official one. See the json files in the [schemas](schemas/) directory
for the current spec we're validating against.

We ([mySociety](http://www.mysociety.org/)) are using this project to help
develop the standard in the light of requirements from our own projects. The
eventual aim is to be Popolo compliant.

## Installation

``` bash
npm install popit-api
```

## Usage

Example of how to create a simple API server.

Put the following in a file called `server.js` in the directory where
you installed `popit-api`.

``` javascript
var express = require('express'),
    popitApi  = require('popit-api');

var app = express();

// Configure the PopIt API app
var apiApp = popitApi({
  databaseName: 'popit-api-example-instance'
});

// Mount the PopIt API app at the appropriate path
app.use('/api', apiApp);

// Start to listen
app.listen(3000);
console.log("API Server listening at http://localhost:3000/api");
```

The run it with node.

```bash
node server.js
```

You should then be able to go to http://localhost:3000/api/persons to list all
people (which will not be any initially as the database is empty).

You can add a person to the database using curl.

```bash
curl \
-H 'Content-Type: application/json' \
-d '{"id": "david-cameron", "name": "David Cameron", "email": "camerond@example.com"}' \
http://localhost:3000/api/persons
```

Which should give the following response.

```
{
  "result": {
    "id": "david-cameron",
    "name": "David Cameron",
    "email": "camerond@example.com"
  }
}
```

Now visiting http://localhost:3000/api/persons you will see the entry
you just created.

## Philosophy

This app provides a REST interface to an API that lets you store
[Popolo](http://popoloproject.com/) compliant data.

It does not provide any logging and only basic authentication. It is intended
that you will do this in the app that you use this module in.

## Development setup

There is a test app included that you can use to experiment quickly. These
commands will get you a dev environment set up:

``` bash
git clone https://github.com/mysociety/popit-api.git
cd popit-api
npm install
npm test
node test-server.js
open http://localhost:3000/
```

When running the tests or the test-server a database called `test-popit-api-db`
is used.

## Configuration

All configuration is done by passing in the config to the app. Currently you
need to either supply one of these two:

``` javascript
// Specify the database name
popitApi({ databaseName: 'name-of-mongodb-to-use' });
```

``` javascript
// Use the hostname to decide the db name
popitApi({ storageSelector: 'hostName' })
```

Expect the configuration to change significantly as we work out what we actually
need.

## Validation

All data written to the REST API is validated against the schemas stored in
[schemas/popolo](schemas/popolo/). Local copies are used rather than fetching over http so that
changes can be easily made and experimented with. Note that these schemas may be
different to the current official ones until the standard is finalised.

## REST actions

The REST API is being kept as simple as possible. We'll be adding features as
required.

Responses are always in JSON, or JSONP if a `callback` query is provided. HTTP
Status codes are used to describe the success or failure. If data is returned it
will be something like:

``` json
{ "result": { "id": "123", "name": "Joe Bloggs" } }
{ "result": [ { "id": "123", "name": "Joe Bloggs" }, ... ] }
```

Errors will also return JSON:

```json
{ "errors": [ "Error message - hopefully helpful...", ... ] }
```

### GET `/api/:collection`

Returns an array of all the documents in that collection (currently there is no
filtering or pagination).

### POST `/api/:collection`

Adds the posted document to the collection, if it validates. Can either specify
an `id` or one will be created. Returns `200` with the document as the body
(with the `id` in it).

### PUT `/api/:collection`

Not implemented, will return `405`. Replacing a whole collection is not
something we think that API users will want to do.

### DELETE `/api/:collection`

Not implemented, will return `405`. Deleting a whole collection is not
something we think that API users will want to do.

### GET `/api/:collection/:id`

Returns the document requested, or `404` if it does not exist.

### POST `/api/:collection/:id`

Not implemented, will return `405`. As the documents can not be treated as
collections adding something to them with a `POST` does not apply.

### PUT `/api/:collection/:id`

Replaces the current document with the one provided, if valid. Returns the document with status `200`.

### DELETE `/api/:collection/:id`

Deletes the document. Returns `204` (even if the document did not exist).


## Deployment

You'll probably want to mount this app in your own app. For an example see
`server.js` in the `mysociety-deploy` branch. This is how we deploy it.
