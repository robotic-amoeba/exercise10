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
  errorThresholdPercentage: 30, // When 50% of requests fail, trip the circuit
  resetTimeout: 3000 // After 30 seconds, try again.
};
const circuitBreaker = require("opossum");
const circuit = circuitBreaker(requestToMessageAPP, options);

function requestToMessageAPP(message) {
  return messageAPP
    .post("/message", message)
    .then(response => {
      debug("Success sending the message: Response: ", response.data);
      message.status = "OK";
      return message;
    })
    .catch(error => {
      if (error.response || error.request) {
        debug("Error in messageapp");
        message.status = "ERROR";
        if (error.code && error.code === "ECONNABORTED") {
          debug("Timeout Exceeded!");
          message.status = "TIMEOUT";
          throw error.code;
        }
      } else {
        debug("Error in HTTP request");
        message.status = "ERROR";
      }
      throw "ERROR";
    });
}

circuit.on("timeout", a => console.log("TIMEOUT: timeout in the circuit", a));
circuit.on("reject", () => {
  console.log(`REJECT: The circuit is open. Failing fast.`);
});
circuit.on("close", () => console.log("CIRCUIT CLOSED"));
circuit.on("open", () => console.log("CIRCUIT OPENED"));

module.exports = function(messageReq) {
  const message = {
    destination: messageReq.destination,
    body: messageReq.body
  };
  if (messageReq.status === "PAYED") {
    circuit
      .fire(message)
      .then(message => {
        if (message) {
          saveMessage(message);
          console.log("saved in then: ", message);
        }
      })
      .catch(e => console.error("Error inside the circuit: ", e));

    circuit.fallback(message => {
      if (message.status) {
        saveMessage(message);
        console.log("saved in fallback: ", message);
      }
    });
  } else {
    saveMessage(messageReq);
  }
};
