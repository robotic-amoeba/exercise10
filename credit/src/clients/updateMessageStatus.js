const Message = require("../models/message");
const updateCreditTransaction = require("../transactions/updateCredit");
const saveMessageTransaction = require("../transactions/saveMessage");

module.exports = function(requestID, status, cb) {
  return Message()
    .findOneAndUpdate({ requestID }, { status }, { new: true })
    .then(message => {
      console.log("Updated message status to :", message.status);
    })
    .catch(error => {
      cb(null, error);
    });
};
