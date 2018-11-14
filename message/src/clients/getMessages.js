const Message = require("../models/message");

module.exports = function(conditions = {}) {
  return Message().find(conditions);
};
