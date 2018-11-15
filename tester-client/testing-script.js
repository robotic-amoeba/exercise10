const ClientService = require("./ClientService");
const client = new ClientService();

let n = 0;

setInterval(function() {
  n++
  client.testPostEndpoint("/messages", {destination: "Raul", body: `A cool message number ${n}`});
}, 600);
