const Credit = require("../models/credit");
const debug = require("debug")("debug:getCredit");

module.exports = function(conditions = { location: "Default" }) {
  debug("credit solicited");
  return Credit().find(conditions);
};
