const updateCreditTransaction = require("../transactions/updateCredit");

module.exports = function(message) {
  updateCreditTransaction(
    {
      amount: { $gte: 0 }
    },
    {
      $inc: { amount: 1 }
    },
    function(doc, error) {
      if (error) {
        console.log(error);
      }
    }
  )
    .then(() => {
      console.log(`Rollback done over request: ${message}`);
    })
    .catch(e => console.log(e));
};
