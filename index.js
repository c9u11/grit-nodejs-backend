const axios = require("axios");
const cheerio = require("cheerio");
const db = require("./config/mysql.js");
const OpenAI = require("openai");

const conn = db.init();
const openai = new OpenAI();

const PROMPT = `
기사에서 어려울 수 있는 단어(한자어 또는 순우리말)를 골라서 퀴즈를 만들고 문해력을 올릴 수 있는 플랫폼을 만들고있어
너는 기사에서 단어를 고르고 퀴즈를 만드는 역할을 담당해
퀴즈는 4지선다로 나오고 문장, 문제, 보기, 정답, 풀이가 필요해
아래 예시와 동일한 형식으로 하나의 문제를 만들면 돼

--- 답변 예시 ---
{
  "sentence" : "공용 공간을 목적과 다르게 점유하는 경우 철거나 수거를 강제하는 형태의 법적 조치가 가능하다는 의견이 나옵니다.",
  "quizTitle" : "'점유'라는 단어는 이 문장에서 어떤 의미로 사용되었을까요?",
  "choices" : [
    "임시적으로 사용하기",
    "법적으로 소유하기",
    "무단으로 사용하는 행위",
    "장기적으로 관리하기"
  ],
  "answer" : 3,
  "solution" : "‘점유’는 이 문장에서 공용 공간을 목적에 맞지 않게 무단으로 사용하는 것을 의미합니다. 이러한 무단 점유는 주차장 같은 공용 공간에서 발생할 수 있으며 법적인 문제로 이어질 수 있습니다."
}

아래 기사를 보고 문제를 만들어줘
`

const getArticleContent = async (url) => {
  try {
    const page = await axios.get(`https://www.chosun.com/${url}`);
    const $ = cheerio.load(page.data);
    const html = $.html();
    const match = html.match(/Fusion\.globalContent\s*=\s*(\{.*?\});/s);
    if (match) {
      const json = JSON.parse(match[1]);
      const body = json.content_elements.reduce((acc, cur) => {
        if (cur.type === "text") {
          acc += cur.content + "\n";
        }
        return acc;
      }, "");
      return body;
    }
    return "";
  } catch (error) {
    console.error(error);
  }
}

const getTopRankArticle = async () => {
  try {
    const datas = [
      { id: 1, category: "politics", articles: [] },
      { id: 2, category: "national", articles: [] },
      { id: 3, category: "international", articles: [] },
      { id: 4, category: "medical", articles: [] },
      { id: 5, category: "sports", articles: [] },
    ];
    for (data of datas) {
      const page = await axios.get(`https://www.chosun.com/${data.category}`);
      const $ = cheerio.load(page.data);
      const html = $.html();
      const match = html.match(/Fusion\.contentCache\s*=\s*(\{.*?\});/s);
      if (match) {
        const json = JSON.parse(match[1]);
        const chartbeatToppages = json["chartbeat-toppages"];
        const key = Object.keys(chartbeatToppages)[0];
        const charts = chartbeatToppages[key].data.content_elements;
        const result = [];
        charts.forEach(async (chart) => {
          const body = await getArticleContent(chart.website_url);
          result.push({
            title: chart.headlines.basic,
            url: chart.website_url,
            body: body,
          });
        });
        data.articles = result;
      }
    }
    return datas;
  } catch (error) {
    console.error(error);
  }
};

const main = async () => {
  const topRankArticles = await getTopRankArticle();


  for (let topArticleIdx = 0; topArticleIdx < topRankArticles.length; topArticleIdx++) {
    const topRankArticle = topRankArticles[topArticleIdx];
    console.log(topRankArticle.id, topRankArticle.category);

    for (let articleIdx = 0; articleIdx < topRankArticle.articles.length; articleIdx++) {
      const article = topRankArticle.articles[articleIdx];
      if (articleIdx > 2) break;

      const splitUrl = article.url.split("/");
      const numberIdx = splitUrl.findIndex((url) => url !== "" && !isNaN(url));
      const date = `${splitUrl[numberIdx]}-${splitUrl[numberIdx + 1]}-${splitUrl[numberIdx + 2]}`;
      conn.query("INSERT INTO articles (category_id, title, body, url, created_at) VALUES (?, ?, ?, ?, ?)", [topRankArticle.id, article.title, article.body, article.url, date], (err, rows) => {
        if (err) throw err;
      });

      openai.chat.completions.create({
        messages: [{
          role: "system",
          content: `${PROMPT}${article.body}`
        }],
        model: "gpt-3.5-turbo",
      }).then(res => {
        const content = res.choices[0].message.content;
        const json = JSON.parse(content);
        conn.query("INSERT INTO questions (article_id, title, body, answer, solution) VALUES (?, ?, ?, ?, ?)", [topRankArticle.id, json.quizTitle, json.sentence, json.answer, json.solution], (err, rows) => {
          if (err) throw err;
          const questionId = rows.insertId;
          json.choices.forEach((choice, idx) => {
            conn.query("INSERT INTO choices (question_id, choices.index, body) VALUES (?, ?, ?)", [questionId, idx + 1, choice], (err, rows) => {
              if (err) throw err;
            });
          });
        });
      }).catch(err => {
        console.error('문제 생성 실패', err);
      });
    }
  }
};

main();