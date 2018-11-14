const http = require("http");
const saveMessage = require("../clients/saveMessage");
const updateStatus = require("../clients/updateMessageStatus");
const getCredit = require("../clients/getCredit");

const random = n => Math.floor(Math.random() * Math.floor(n));

module.exports = function(httpbody) {
  const requestID = httpbody.requestID;
  const body = JSON.stringify(httpbody);
  var query = getCredit();

  query.exec(function(err, credit) {
    if (err) return console.log(err);

    saveMessage(
      {
        ...httpbody,
        requestID,
        status: "PENDING"
      },
      function(_result, error) {
        if (error) {
          console.log(error);
        }
      }
    );

    current_credit = credit[0].amount;

    if (current_credit > 0) {
      const postOptions = {
        // host: "exercise4_messageapp_1",
        // host: "messageapp",
        host: "localhost",
        port: 3000,
        path: "/message",
        method: "post",
        json: true,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      };

      let postReq = http.request(postOptions);

      postReq.on("response", postRes => {
        let status;
        if (postRes.statusCode === 200) {
          console.error("Succes sending the message");
          status = "OK";
        } else {
          console.error("Error while sending message");
          status = "ERROR";
        }
        updateStatus(requestID, status, function(_result, error) {
          if (error) {
            console.log(error);
          } else {
            console.log(postRes.body);
          }
        });
      });

      postReq.setTimeout(random(6000));

      postReq.on("timeout", () => {
        console.error("Timeout Exceeded!");
        postReq.abort();
        const status = "TIMEOUT"
        updateStatus(requestID, status, function(_result, error) {
          console.log(error)
        });
      });

      postReq.on("error", () => {});

      postReq.write(body);
      postReq.end();
    } else {
      console.log("No credit error");
    }
  });
};
