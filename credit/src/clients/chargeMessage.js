const updateCreditTransaction = require("../transactions/updateCredit");
const getCredit = require("./getCredit");
const debug = require("debug")("debug:chargeMessage");
const addToProcessedQueue = require("../controllers/processedQueue");

module.exports = function(message) {
  const query = getCredit();

  query.exec(function(err, credit) {
    if (err) return console.log(err);

    current_credit = credit[0].amount;

    if (message.location === undefined) {
      message.location = { name: "Default", cost: 1 };
    }

    if (current_credit > 0) {
      debug(`Found credit (${credit}) in the if statatement`);
      updateCreditTransaction(
        {
          amount: { $gte: 1 },
          location: message.location.name
        },
        {
          $inc: { amount: -message.location.cost }
        },
        function(doc, error) {
          if (error) {
            return cb(undefined, error);
          } else if (doc == undefined) {
            let error = "Not enough credit";
            message.staus = "NO CREDIT";
            console.log(error);
            cb(undefined, error);
          }
        }
      ).then(() => {
        message.status = "PAYED";
        addToProcessedQueue(message);
      });
    } else {
      debug("Found not enough credit in the if statement: ", credit);
      //THROW EVENT TO WARN MESSAGE: NOT ENOUGH CREDIT
      message.status = "NO CREDIT";
      addToProcessedQueue(message);
    }
  });
};
