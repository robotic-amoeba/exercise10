const uuidv1 = require("uuid/v1");
const Queue = require("bull");
const debug = require("debug")("debug:requestQueue");
const requestsQueue = new Queue("MessageRequests", "redis://127.0.0.1:6379");
const saveMessage = require("../clients/saveMessage");

const ProcessedRequests = new Queue("ProcessedRequests", "redis://127.0.0.1:6379");
let processDownTheAppIsHealthy = true;
ProcessedRequests.on("global:paused", () => {
  processDownTheAppIsHealthy = false;
});
ProcessedRequests.on("global:resumed", () => {
  processDownTheAppIsHealthy = true;
});

module.exports = (req, res) => {
  const httpbody = req.body;
  httpbody.requestID = uuidv1();
  saveMessage(
    {
      ...httpbody,
      status: "PENDING"
    },
    function(_result, error) {
      if (error) {
        console.log(error);
      }
    }
  );
  requestsQueue
    .add(httpbody)
    .then(job => {
      debug("created a job succesfully");
      if (processDownTheAppIsHealthy) {
        res.status(200).send(
          `Request received. Check the status at: http://--/messages/${httpbody.requestID}/status`
        );
      } else {
        res.status(500).send("KO");
      }
    })
    .catch(e => {
      debug("error while trying to add a job to the queue: requestsQueue");
      console.log(e);
    });
};
