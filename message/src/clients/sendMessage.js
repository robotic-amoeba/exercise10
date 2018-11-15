const saveMessage = require("./saveMessage");
const debug = require("debug")("debug:sendMessage");
const axios = require("axios");
const messageAPP = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 2000
});

const options = {
  timeout: 3000, //3s
  errorThresholdPercentage: 50, //50% fails open the circuit
  resetTimeout: 3000 //3s
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
      job.remove();
      return message;
    })
    .catch(error => {
      message.status = "ERROR";
      debug("Error in messageapp");
      if (error.response || error.request) {
        if (error.code && error.code === "ECONNABORTED") {
          message.status = "TIMEOUT";
          throw "TIMEOUT";
        }
      }
      ProcessedRequests.add(job.data);
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
      } else {
        console.log("Failed: ", message);
        setTimeout(() => ProcessedRequests.add(job.data), 5000);
      }
    });
  } else {
    saveMessage(messageReq);
  }
};
