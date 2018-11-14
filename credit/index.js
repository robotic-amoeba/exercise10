const express = require("express");
const requestsWorker = require("./src/controllers/requestsWorker");

const bodyParser = require("body-parser");
const { Validator, ValidationError } = require("express-json-validator-middleware");

const updateCredit = require("./src/controllers/updateCredit");

const app = express();

const validator = new Validator({ allErrors: true });
const { validate } = validator;

const creditSchema = {
  type: "object",
  required: ["amount"],
  properties: {
    location: {
      type: "string"
    },
    amount: {
      type: "number"
    }
  }
};

app.post("/credit", bodyParser.json(), validate({ body: creditSchema }), updateCredit);

app.use(function(err, req, res, next) {
  console.log(res.body);
  if (err instanceof ValidationError) {
    res.sendStatus(400);
  } else {
    res.sendStatus(500);
  }
});

app.listen(9006, function() {
  console.log("App started on PORT 9006");
});
