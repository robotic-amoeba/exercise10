const ClientService = require("./ClientService");
const client = new ClientService();


setInterval(function() {
  client.testPostEndpoint("/messages", {destination: "Raul", body: "A cool message"});
}, 1000);
