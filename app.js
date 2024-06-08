const express = require("express");
const db = require("./config/mysql.js");

const app = express();
const conn = db.init();

const PORT = 8080;

const router = express.Router();
app.use('/api', router)

router.get('/users', (req, res) => {
  conn.query("SELECT * FROM users", (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get('/signup', (req, res) => {
  res.send("Hello World!");
});



app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);
})