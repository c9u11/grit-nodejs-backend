const express = require("express");
const db = require("./config/mysql.js");
const bodyParser = require("body-parser");
const jwt = require('./utils/jwt.js');

const app = express();
const conn = db.init();

const PORT = 8080;

const router = express.Router();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api', router);

// 유저 목록 조회
router.get('/users', (req, res) => {
  conn.query("SELECT * FROM users", (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

// 회원가입
router.post('/signup', (req, res) => {
  const body = req.body;

  conn.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [body.username, body.email, body.password], (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

// 로그인
router.post('/login', (req, res) => {
  const body = req.body;
  const email = body.email;
  const password = body.password;

  conn.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, rows) => {
    if (err) throw err;
    if (rows.length > 0) {
      const user = rows[0];
      const token = jwt.sign({ id: user.id, email: user.email });
      res.send({ token });
    } else {
      res.send({ message: "Invalid email or password" });
    }
  });
});

// 카테고리 목록 조회
router.get('/categories', (req, res) => {
  conn.query("SELECT * FROM categories", (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

// 선택된 카테고리 목록 조회
router.get('/categories/selected', (req, res) => {
  const userId = 1;
  conn.query("SELECT * FROM selected_categories WHERE user_id = ?", [userId], (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

// 카테고리 선택
router.post('/categories/selected', (req, res) => {
  const body = req.body;
  const userId = 1;
  const values = body.category.map(categoryId => `(${userId}, ${categoryId})`).join(',');
  conn.query("INSERT INTO selected_categories (user_id, category_id) VALUES " + values, [], (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);
})