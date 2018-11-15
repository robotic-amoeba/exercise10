const debug = require("debug")("debug:processedQueue");
const Queue = require("bull");
const options = { defaultJobOptions: { removeOnComplete: false } };
const ProcessedRequests = new Queue("ProcessedRequests", "redis://127.0.0.1:6379", options);
//const ProcessedRequests = new Queue("ProcessedRequests", "redis://redis:6379");

module.exports = message => {
  ProcessedRequests.getWaiting().then(messagesEnqueued => {
    if (messagesEnqueued>100) {
      console.log(messagesEnqueued);
      ProcessedRequests.add(message, { removeOnComplete: false })
        .then(job => {
          debug("Request processed at credit and added to the queue: ", job.data);
        })
        .catch(e => {
          debug("error while trying to add a job to the queue: processedQueue");
          console.log(e);
        });
    } else {
      console.error("BLOCKIN REQUESTS IN PROCESSED QUEUE: OVERFLOW");
      return;
    }
  });
};
