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

## Prerequisites

Install these dependencies using your package manager:

- [MongoDB](http://docs.mongodb.org/manual/installation/)
- [Elasticsearch](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/setup.html#setup-installation)


## Installation

``` bash
npm install popit-api
```

## Usage

Example of how to create a simple API server.

```
mkdir popit-api-example && cd popit-api-example
npm install express popit-api
```

Put the following in a file called `server.js`:

``` javascript
var express = require('express'),
    popitApi  = require('popit-api');

var app = express();

// Configure the PopIt API app
var apiApp = popitApi({
  databaseName: 'mp-contacts'
});

// Mount the PopIt API app at the appropriate path
app.use('/api', apiApp);

// Start to listen
app.listen(3000);
console.log("API Server listening at http://127.0.0.1:3000/api");
```

Then run it with node.

```bash
node server.js
```

You should then be able to go to http://127.0.0.1:3000/api/persons to list all
people (which will not be any initially as the database is empty).

You can add a person to the database using curl.

```bash
curl \
-H 'Content-Type: application/json' \
-d '{"id": "uk.org.publicwhip/member/40665", "name": "David Cameron", "email": "camerond@example.com"}' \
http://127.0.0.1:3000/api/persons
```

Which should give the following response.

```
{
  "result": {
    "id": "uk.org.publicwhip/member/40665",
    "name": "David Cameron",
    "email": "camerond@example.com"
  }
}
```

Now visiting http://127.0.0.1:3000/api/persons you will see the entry
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
open http://127.0.0.1:3000/
```

When running the tests or the test-server a database called `test-popit-api-db`
is used.

## Configuration

All configuration is done by passing in the config to the app. Currently you
need to either supply one of these two:

``` javascript
// Specify the database name directly
var apiApp = popitApi({
  databaseName: 'name-of-mongodb-to-use'
});
```

``` javascript
// Derive the database name from the Host header
var apiApp = popitApi({
  storageSelector: 'hostName'
});
```

If you want to include `url` properties in the API output then you'll need to configure the API with an `apiBaseUrl` to use.

```javascript
var apiApp = popitApi({
  databaseName: 'name-of-mongodb-to-use',
  apiBaseUrl: 'http://example.org/api'
});
```

Expect the configuration to change significantly as we work out what we actually
need.

## Validation

All data written to the REST API is validated against the schemas stored in
[schemas/popolo](schemas/popolo/). Local copies are used rather than fetching over http so that
changes can be easily made and experimented with. Note that these schemas may be
different to the current official ones until the standard is finalised.

## Hidden fields

Some applications may want to keep a subset of fields hidden from the
public. For example, PopIt could be used to store contact details for
writing to MPs, the MP has given the service their email to use but
don't want it to be publicly available. The service can still store
email addresses in PopIt, but they will only be returned when the
correct API key is provided.

The simplest way to get started is to specify fields to be hidden
**globally** directly in the configuration when creating the api using the
`fieldSpec` option, along with an API key which will unlock all the fields.

```javascript
// ...

// Configure the PopIt API app with hidden fields.
var apiApp = popitApi({
  databaseName: 'mp-contacts',
  apiKey: 'secret' // This could come from an environment variable or similar
  fieldSpec: [
    {
      collectionName: 'persons',
      fields: {
        email: false
      }
    }
  ]
});

// ...
```

This example uses `email: false` in the `fieldSpec` option, which means
that the email field will not be included it the response. If you wanted
the output to *only* contain an email address then you'd set `email:
true` which wouldn't render any fields except the email.

After restarting the app, public requests to http://127.0.0.1:3000/api/persons
won't include any email addresses unless you specify provide the correct `apiKey`
parameter, e.g. http://127.0.0.1:3000/api/persons?apiKey=secret.

### Specifying hidden documents in the database

Putting the hidden fields in the configuration is a convenient way to
hide fields across all instances, but sometimes you might want more
granular control over which documents are hidden in which database. To
do this you can add documents to a `hidden` collection in the database
you want to change, as shown below.

To hide all the email addresses for people in this instance, add a
document to mongo from the command line:

```
mongo mp-contacts
> db.hidden.insert({collectionName: 'persons', fields: {email: false}})
```

Or to hide an individual document's fields

```
mongo mp-contacts
> db.hidden.insert({collectionName: 'persons', doc: 'uk.org.publicwhip/member/40665', fields: {email: false}})
```

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

### GET `/api/search/:collection?q=<search-query>`

Searches for a document in the named collection which matches the `q` parameter.

## Deployment

You'll probably want to mount this app in your own app. For an example see
`server.js` in the `mysociety-deploy` branch. This is how we deploy it.
