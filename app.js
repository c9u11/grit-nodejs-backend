const express = require("express");
const db = require("./config/mysql.js");
const bodyParser = require("body-parser");

const app = express();
const conn = db.init();

const PORT = 8080;

const router = express.Router();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api', router);

router.get('/users', (req, res) => {
  conn.query("SELECT * FROM users", (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.post('/signup', (req, res) => {
  const body = req.body;

  conn.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [body.username, body.email, body.password], (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});




app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);
})