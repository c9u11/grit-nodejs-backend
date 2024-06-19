const express = require("express");
const db = require("./config/mysql.js");
const bodyParser = require("body-parser");
const jwt = require('./utils/jwt.js');
const cors = require('cors');

const app = express();
const conn = db.init();

const PORT = 8080;

const router = express.Router();
app.use(cors());
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

  conn.query("SELECT * FROM users WHERE email = ?", [body.email], (err, rows) => {
    if (err) throw err;
    if (rows.length > 0) {
      res.send({ code: 400, message: "Email already exists" });
      return;
    }
  });

  conn.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [body.username, body.email, body.password], (err, rows) => {
    if (err) {
      req.send({ code: 400, message: "Signup Error!" });
      throw err
    };
    res.send({ code: 200, message: "Signup Success!" });
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
      conn.query("SELECT * FROM selected_categories WHERE user_id = ?", [user.id], (err, rows) => {
        if (err) throw err;
        const selectedCategories = rows.map(row => row.category_id);
        const token = jwt.sign({ id: user.id, email: user.email, username: user.username });
        res.send({ code: 200, token, selectedCategories });
      });
    } else {
      res.send({ code: 400, message: "Invalid email or password" });
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
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const userId = auth.payload.id;
  conn.query("SELECT * FROM selected_categories WHERE user_id = ?", [userId], (err, rows) => {
    if (err) throw err;
    res.send({
      code: 200,
      selectedCategories: rows.map(row => row.category_id),
      username: auth.payload.username,
    });
  });
});

// 카테고리 선택
router.post('/categories/selected', (req, res) => {
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const userId = auth.payload.id;
  const body = req.body;
  // remove all selected categories
  conn.query("DELETE FROM selected_categories WHERE user_id = ?", [userId], (err, rows) => {
    if (err) throw err;
  });

  const values = body.selectedCategories.map(categoryId => `(${userId}, ${categoryId})`).join(',');
  conn.query("INSERT INTO selected_categories (user_id, category_id) VALUES " + values, [], (err, rows) => {
    if (err) throw err;
    res.send({
      code: 200,
      message: "Selected categories updated",
    });
  });
});

// 기사 조회
router.get('/articles', (req, res) => {
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const articleId = req.query.articleId;
  conn.query("SELECT * FROM articles WHERE id = ?", [articleId], (err, row) => {
    if (err) throw err;
    res.send({
      code: 200,
      article: row,
    });
  });
});

// 오늘의 기사 조회
router.get('/articles/today', (req, res) => {
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const userId = auth.payload.id;
  conn.query("SELECT * FROM selected_categories WHERE user_id = ?", [userId], (err, catgories) => {
    if (err) throw err;
    const query = catgories.map(category => `(SELECT * FROM articles WHERE category_id = ${category.category_id} ORDER BY id DESC LIMIT 1)`).join(' UNION ALL ');
    conn.query(query, (err, articles) => {
      if (err) throw err;
      res.send({
        code: 200,
        articles: articles.map(article => {
          return {
            ...article,
          }
        })
      });
    });
  });
});

// 내가 푼 기사 목록 조회
router.get('/articles/solved', (req, res) => {
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const userId = auth.payload.id;
  const articleId = req.query.articleIds.split(',');
  conn.query("SELECT id FROM questions WHERE article_id IN (?)", [articleId], (err, rows) => {
    if (err) throw err;
    conn.query("SELECT question_id FROM histories WHERE user_id = ? AND question_id IN ( ? )", [userId, rows.map(row => row.id)], (err, rows) => {
      if (err) throw err;
      conn.query("SELECT article_id FROM questions WHERE id IN (?)", [rows.map(row => row.question_id)], (err, rows) => {
        if (err) throw err;
        res.send({
          code: 200,
          articleIds: rows.map(row => row.article_id),
        });
      });
    });
  });
});

// 문제 조회
router.get('/question', (req, res) => {
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const articleId = req.query.articleId;
  conn.query("SELECT * FROM questions WHERE article_id = ?", [articleId], (err, questions) => {
    if (err) throw err;
    const questionId = questions[0].id;
    conn.query("SELECT * FROM choices WHERE question_id = ?", [questionId], (err, rows) => {
      if (err) throw err;
      res.send({
        code: 200,
        question: {
          ...questions[0],
          choices: rows
        }
      });
    });
  });
});

// 문제 history 조회
router.get('/history', (req, res) => {
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const userId = auth.payload.id;
  const questionId = req.query.questionId;
  conn.query("SELECT * FROM histories WHERE user_id = ? AND question_id = ?", [userId, questionId], (err, rows) => {
    if (err) throw err;
    res.send({
      code: 200,
      histories: rows,
    });
  });
});

// 문제 풀기
router.post('/history', (req, res) => {
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const userId = auth.payload.id;
  const body = req.body;
  conn.query("INSERT INTO histories (user_id, question_id, selected_choice) VALUES (?, ?, ?)", [userId, body.questionId, body.answer], (err, rows) => {
    if (err) throw err;
    res.send({
      code: 200,
      message: "History saved",
    });
  });
});

// ranking 조회
router.get('/ranking', (req, res) => {
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const userId = auth.payload.id;
  conn.query("SELECT user_id, username, COUNT(*) FROM histories JOIN users ON histories.user_id = users.id GROUP BY user_id ORDER BY COUNT(*)", (err, rows) => {
    if (err) throw err;
    res.send({
      code: 200,
      ranking: rows,
      userId,
    });
  });
});

// 통계 조회
router.get('/statistics', (req, res) => {
  const auth = jwt.verify(req.headers.authorization);
  if (!auth.result) {
    res.send({ code: 400, message: "Invalid token" });
    return;
  }
  const userId = auth.payload.id;
  conn.query("SELECT COUNT(*) as total, SUM(CASE WHEN joinTable.selected = joinTable.answer THEN 1 ELSE 0 END)/COUNT(*) as accuracy_rate  FROM (	SELECT c.index as selected, q.answer as answer FROM histories h JOIN questions q ON h.question_id = q.id JOIN choices c ON h.selected_choice = c.id WHERE h.user_id = ?) as joinTable;", [userId], (err, rows) => {
    if (err) throw err;
    res.send({
      code: 200,
      statistics: rows[0],
    });
  });
});

app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);
})