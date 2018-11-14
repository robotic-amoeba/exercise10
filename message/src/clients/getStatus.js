const Message = require("../models/message");

module.exports = function(requestID) {
  condition = {requestID};
  return Message().find(condition);
};