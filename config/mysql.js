const mysql = require("mysql2");

const DB_INFO = {
  host: "localhost",
  port: "3306",
  user: "root",
  password: "12345678",
  database: "grit"
}

module.exports = {
  init: function () {
    return mysql.createConnection(DB_INFO);
  },
  connect: function (conn) {
    conn.connect(function (err) {
      if (err) console.error("mysql connection error : " + err);
      else console.log("mysql is connected successfully!");
    });
  },
};