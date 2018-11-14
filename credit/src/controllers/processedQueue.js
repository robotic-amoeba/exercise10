const debug = require("debug")("debug:processedQueue");
const Queue = require("bull");
const ProcessedRequests = new Queue("ProcessedRequests", "redis://127.0.0.1:6379");
//const ProcessedRequests = new Queue("ProcessedRequests", "redis://redis:6379");

module.exports = message => {
  ProcessedRequests.add(message)
    .then(job => {
      debug("Request processed at credit and added to the queue: ", job.data);
    })
    .catch(e => {
      debug("error while trying to add a job to the queue: processedQueue");
      console.log(e);
    });
};
