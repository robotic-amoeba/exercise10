const debug = require("debug")("debug:payedRequestsWorker");
const Queue = require("bull");
const ProcessedRequests = new Queue("ProcessedRequests", "redis://127.0.0.1:6379");
//const ProcessedRequests = new Queue("ProcessedRequests", "redis://redis:6379");
const sendMessage = require("../clients/sendMessage");

module.exports = ProcessedRequests.process(job => {
  debug("Payed request received: ", job.data);
  sendMessage(job);
});
