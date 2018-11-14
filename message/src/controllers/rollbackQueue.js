const Queue = require("bull");
const debug = require("debug")("debug:rollbackQueue");
const rollbackQueue = new Queue("rollbackQueue", "redis://127.0.0.1:6379");
//const requestsQueue = new Queue("rollbackQueue", "redis://redis:6379");

module.exports = message => {
  rollbackQueue
    .add(message)
    .then(job => {
      debug("rollback added to queue", job.data);
    })
    .catch(e => {
      debug("error while trying to add a job to the queue: rollbackQueue");
      console.log(e);
    });
};
