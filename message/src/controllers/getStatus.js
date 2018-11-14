const getStatus = require("../clients/getStatus");

module.exports = function(req, res) {
  const requestID = req.params.requestID;
  getStatus(requestID).then(message => {
    res.json(message);
  });
};
