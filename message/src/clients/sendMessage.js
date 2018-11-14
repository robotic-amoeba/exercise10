const saveMessage = require("./saveMessage");
const debug = require("debug")("debug:sendMessage");
const axios = require("axios");
const messageAPP = axios.create({
  //baseURL: "http://messageapp:3000",
  baseURL: "http://localhost:3000",
  timeout: 3000
});
const rollBackPolicy = require("../controllers/rollbackQueue");

function requestToMessageAPP(message, retries) {
  messageAPP
    .post("/message", message)
    .then(response => {
      debug("Success sending the message: Response: ", response.data);
      message.status = "OK";
      saveMessage(message);
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
          //we don't retry here,
          //but we could use a different policy if we wanted
          return error.code;
        }

        saveMessage(message);
        retries--;
        retryPolicy(message, retries);
      } else {
        debug("Error in HTTP request");
        message.status = "ERROR";
        saveMessage(message);
        retryPolicy(message, retries);
      }
      debug("retries left: ", retries);
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
    requestToMessageAPP(message, 5);
  } else {
    saveMessage(messageReq);
  }
};
