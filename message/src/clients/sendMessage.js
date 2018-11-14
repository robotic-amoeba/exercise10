const saveMessage = require("./saveMessage");
const debug = require("debug")("debug:sendMessage");
const axios = require("axios");
const messageAPP = axios.create({
  //baseURL: "http://messageapp:3000",
  baseURL: "http://localhost:3000",
  timeout: 2000
});
const rollBackPolicy = require("../controllers/rollbackQueue");

const circuitBreaker = require("opossum");
const options = {
  timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
  errorThresholdPercentage: 30, // When 50% of requests fail, trip the circuit
  resetTimeout: 3000 // After 30 seconds, try again.
};
const circuit = circuitBreaker(requestToMessageAPP, options);
circuit.on("timeout", a => console.log("TIMEOUT: timeout in the circuit", a));
circuit.on("reject", () => {
  console.log(`REJECT: The circuit is open. Failing fast.`);
});
circuit.on("halfOpen", a => console.log(`CIRCUIT HALF_OPEN after ${a}ms of recovery time`));
circuit.on("close", () => console.log("CIRCUIT CLOSED"));
circuit.on("open", () => console.log("CIRCUIT OPENED"));

function requestToMessageAPP(message, retries) {
  return messageAPP
    .post("/message", message)
    .then(response => {
      debug("Success sending the message: Response: ", response.data);
      message.status = "OK";
      saveMessage(message);
      return message;
    })
    .catch(error => {
      let customError;
      if (error.response || error.request) {
        debug("Error in messageapp");
        message.status = "ERROR";

        if (error.code && error.code === "ECONNABORTED") {
          debug("Timeout Exceeded!");
          message.status = "TIMEOUT";
          saveMessage(message);
          throw error.code;
        }

        saveMessage(message);
        retries--;
        //retryPolicy(message, retries);
      } else {
        debug("Error in HTTP request");
        message.status = "ERROR";
        saveMessage(message);
        retries--;
        //retryPolicy(message, retries);
      }
      debug("retries left: ", retries);
      throw "ERROR";
    });
}

function retryPolicy(message, retries) {
  let fatalErrorsCount = 0;
  if (retries > 0) {
    //timeout increases with every retry up to 15s
    debug(`Messageapp communication failed: retrying in ${Math.floor(15000 / retries)} seconds`);
    setTimeout(() => {
      requestToMessageAPP(message, retries);
    }, Math.floor(15000 / retries));
  } else {
    debug("Fatal error after 5 retries. Returning cash to account");
    fatalErrorsCount++;
    rollBackPolicy(message);
    if (fatalErrorsCount === 10) {
      console.log("10 fatal errors occurred. Could be nothing, but check Messageapp");
    }
  }
}

module.exports = function(messageReq) {
  const message = {
    destination: messageReq.destination,
    body: messageReq.body
  };
  if (messageReq.status === "PAYED") {
    //requestToMessageAPP(message, 5);
    circuit
      .fire(message, 5)
      .then(a => console.log("continua el flujo de ejec:", a))
      .catch(() => console.error("error en circuit-----------"));
    circuit.fallback(a => console.log("fallback--------", a));
  } else {
    saveMessage(messageReq);
  }
};
