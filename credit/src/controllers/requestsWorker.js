const Queue = require("bull");
const chargeMessage = require("../clients/chargeMessage");
const requestsQueue = new Queue("MessageRequests", "redis://127.0.0.1:6379");
//const requestsQueue = new Queue("MessageRequests", "redis://redis:6379");
const debug = require("debug")("debug:requestsWorker");

module.exports = requestsQueue.process(job => {
  debug("job received at requests queue: ", job.data);
  chargeMessage(job.data);
});
