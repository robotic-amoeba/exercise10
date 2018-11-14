const saveMessage = require("./saveMessage");
const debug = require("debug")("debug:sendMessage");
const axios = require("axios");
const messageAPP = axios.create({
  //baseURL: "http://messageapp:3000",
  baseURL: "http://localhost:3000",
  timeout: 2000
});

const options = {
  timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
  errorThresholdPercentage: 60, // When 50% of requests fail, trip the circuit
  resetTimeout: 3000 // After 30 seconds, try again.
};
const circuitBreaker = require("opossum");
const circuit = circuitBreaker(requestToMessageAPP, options);

const Queue = require("bull");
const ProcessedRequests = new Queue("ProcessedRequests", "redis://127.0.0.1:6379");

function requestToMessageAPP(message, job) {
  return messageAPP
    .post("/message", message)
    .then(response => {
      debug("Success sending the message: Response: ", response.data);
      message.status = "OK";
      job.remove().then(console.log("job removed"));
      return message;
    })
    .catch(error => {
      if (error.response || error.request) {
        debug("Error in messageapp");
        message.status = "ERROR";
        if (error.code && error.code === "ECONNABORTED") {
          debug("Timeout Exceeded!");
          message.status = "TIMEOUT";
          //console.log(job.getState());
          ProcessedRequests.add(job.data).then("job added");
          throw error.code;
        }
      } else {
        debug("Error in HTTP request");
        message.status = "ERROR";
      }
      ProcessedRequests.add(job.data).then("job added");
      //console.log(job.getState());
      throw "ERROR";
    });
}

circuit.on("timeout", a => console.log("TIMEOUT: timeout in the circuit", a));
circuit.on("reject", () => {
  console.log(`REJECT: The circuit is open. Failing fast.`);
});
circuit.on("close", () => {
  console.log("CIRCUIT CLOSED");
});
circuit.on("open", () => {
  ProcessedRequests.pause(false).then(console.log("Processed req queue stopped"));
  console.log("CIRCUIT OPENED");
});
circuit.on("halfOpen", () => {
  ProcessedRequests.resume(false).then(console.log("Processed req queue resumed"));
});

module.exports = function(job) {
  const messageReq = job.data;
  const message = {
    destination: messageReq.destination,
    body: messageReq.body
  };
  if (messageReq.status === "PAYED") {
    circuit
      .fire(message, job)
      .then(message => {
        if (message) {
          saveMessage(message);
          console.log("Succeded: ", message);
        }
      })
      .catch(e => console.error("Error inside the circuit: ", e));

    circuit.fallback(message => {
      if (message.status) {
        saveMessage(message);
        console.log("Failed: ", message);
      }
    });
  } else {
    saveMessage(messageReq);
  }
};
