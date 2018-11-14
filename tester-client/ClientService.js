const axios = require("axios");

class ClientService {
  constructor() {
    this.service = axios.create({
      baseURL: "http://localhost:9005",
      withCredentials: true
    });
  }

  testGetEndpoint(endpoint) {
    return this.service
      .get(endpoint)
      .then(response => console.log(response.data))
      .catch(error => console.log("error: ", error.response.data));
  }

  testPostEndpoint(endpoint, body) {
    return this.service
      .post(endpoint, body)
      .then(response => console.log(response.data))
      .catch(error => console.log("error: ", error.response.data));
  }
}

module.exports = ClientService;
