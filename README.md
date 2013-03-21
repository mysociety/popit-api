# PopIt API mySociety deployment

At [mySociety](http://www.mysociety.org/) we have a custom deployment system.
This branch contains the files needed for it. Apart from being in the same repo
(for convenience) it is unrelated to the other code, and probably not of
interest to others. Please look at the `master` branch.

## Background

As it is so easy to set up a local node environment for development it is not
expected that much dev will happen on the servers. More likely the deployment
will be for API endpoints, either for testing or production.

This branch contains a simple Express server (`server.js`) that mounts the API
at `/api` and provides appropriate middleware. It also contains the various
configuration files that are needed. The actual `popit-api` code is installed
using [npm](https://npmjs.org/) to encourage us to keep the version there
current.

The MongoDB database name is `'popit-api-' + slugify(req.url.hostname)` (eg
`foo.bar.com` -> `popit-api-foo-bar-com`). This allows several sites to be
served off one vhost which might be convenient and should make the configuration
a little simpler.




