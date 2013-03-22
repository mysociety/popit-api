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

The MongoDB database name is `'popit-api-' + slugify(req.host)` (eg
`foo.bar.com` -> `popit-api-foo-bar-com`). This allows several sites to be
served off one vhost which might be convenient and should make the configuration
a little simpler.


## Files and what they do

### `README.md`

This file that you are reading, please keep up to date :)

### `config/general.json`

The generated config. Listed in `.gitignore` so it won't actually be present
here. Copy and edit the `vhosts-templates/popit-api_config_general.json.ugly`
file to create it.

### `config/packages`

Debian packages that are required. Has MongoDB, but not Node as that is not (at
time of writing) available for our Debian version. See
`config/post_deploy_actions.bash` for Node install.

### `config/popit-api-daemon-debian.ugly`

SYSV init style script that will start the daemon that Apache will proxy to.

### `config/post_deploy_actions.bash`

Script that is run each time post deploy. Makes sure that Node is installed
locally and then installs and updates NPM modules.

### `package.json`

NPM description of this project. Contains the NPM dependencies.

### `server.js`

Very simple script that mounts the API and serves it, producing logs as
appropriate.

### `vhosts-templates/popit-api_config_general.json.ugly`

Template to generate the `config/general.json` file. Output needs to be JSON,
which is quite picky about the formatting. Should be copied to `/data/servers/vhosts/` for it to actually be used.

### `vhosts-templates/popit-api_config_httpd.conf.ugly`

Sample apache config.  Should be copied to `/data/servers/vhosts/` for it to actually be used.
