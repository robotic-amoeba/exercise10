const mongoose = require("mongoose");
const debug = require("debug")("debug:database");

const servers = {
  //primary: "exercise5_mongodb_1:27018",
  //replica: "exercise5_replica_1:27019"
  primary: "127.0.0.1:27018",
  replica: "127.0.0.1:27019"
};
const database = "cabify_bootcamp";

function createConnection(name, server, database) {
  return {
    name,
    isPrimary: false,
    isActive: true,
    conn: mongoose.createConnection(`mongodb://${server}/${database}`, {
      useNewUrlParser: true,
      autoReconnect: true
    })
  };
}

function setupConnection(connection, backup) {
  connection.conn.on("disconnected", () => {
    console.log("Node down:", connection.name);
    connection.isActive = false;
    if (connection.isPrimary) {
      connection.isPrimary = false;
      backup.isPrimary = backup.isActive;
    }
  });
  connection.conn.on("reconnected", () => {
    console.log("Node up:", connection.name);
    connection.isActive = true;
    connection.isPrimary = !backup.isPrimary;
  });
}

const connections = [
  createConnection("PRIMARY", servers.primary, database),
  createConnection("REPLICA", servers.replica, database)
];

connections[0].isPrimary = true;
setupConnection(connections[0], connections[1]);
setupConnection(connections[1], connections[0]);

module.exports = {
  get: function(dbKey) {
    let conn;
    if (dbKey == undefined || dbKey == "primary") {
      conn = connections.find(connection => connection.isPrimary == true);
    } else if (dbKey == "replica") {
      conn = connections.find(connection => connection.isPrimary == false);
    }
    if (conn) {
      debug("Requested connection:", dbKey);
      debug("Found:", conn.name);
    }
    debug("requested the dbKey");
    return conn.conn;
  },

  isReplicaOn: function() {
    replicaOn = connections[0].isActive && connections[1].isActive;
    console.log(`Replica is ${replicaOn ? "ON" : "OFF"}`);
    return replicaOn;
  }
};
