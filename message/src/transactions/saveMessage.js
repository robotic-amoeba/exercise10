const database = require("../database");
const Message = require("../models/message");
const { cleanClone } = require("../utils");
const debug = require("debug")("debug:saveMessageTransaction");

function saveMessageReplica(replica, retries) {
  if (retries > 0) {
    replica.markModified("body");
    return replica
      .save()
      .then(doc => {
        debug("Message replicated successfully", doc);
        return doc;
      })
      .catch(err => {
        console.log("Error while saving message replica", err);
        console.log("Retrying...");
        return saveMessageReplica(replica, retries - 1);
      });
  }
}

function saveMessageTransaction(newValue) {
  const MessagePrimary = Message();
  const MessageReplica = Message("replica");

  let message = new MessagePrimary(newValue);
  debug("message at transaction: ", message);
  return message
    .save()
    .then(doc => {
      debug("Message saved successfully:", doc);
      return cleanClone(doc);
    })
    .then(clone => {
      let replica = new MessageReplica(clone);
      saveMessageReplica(replica, 3);
      return clone;
    })
    .catch(err => {
      console.log("Error while saving message", err);
      throw err;
    });
}

module.exports = function(messageParams, cb) {
  saveMessageTransaction(messageParams)
    .then()
    .catch(err => {
      cb(undefined, err);
    });
};
