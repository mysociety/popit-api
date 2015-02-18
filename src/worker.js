var kue = require('kue');
var _ = require('underscore');
var workers = require('./workers');

function start(queuePrefix) {
  var queue = kue.createQueue({
    prefix: queuePrefix,
  });

  _.each(workers, function(worker, name) {
    queue.process(name, worker);
  });

  process.once('SIGTERM', function(sig) {
    queue.shutdown(function(err) {
      console.log('Kue is shut down.', err || '' );
      process.exit(0);
    }, 5000);
  });
}

module.exports = start;
