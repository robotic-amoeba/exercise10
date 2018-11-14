const getMessages = require("../clients/getMessages");

module.exports = function(req, res) {
  getMessages().then(messages => {
    res.json(messages);
  });
};
