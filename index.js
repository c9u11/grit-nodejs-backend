const axios = require("axios");
const cheerio = require("cheerio");
const db = require("./config/mysql.js");
const conn = db.init();

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

getTopRankArticle().then((topRankArticles) => {
  topRankArticles.forEach((topRankArticle) => {
    console.log(topRankArticle.id, topRankArticle.category);
    topRankArticle.articles.forEach((article, idx) => {
      if (idx > 2) return;
      const splitUrl = article.url.split("/");
      const numberIdx = splitUrl.findIndex((url) => url !== "" && !isNaN(url));
      const date = `${splitUrl[numberIdx]}-${splitUrl[numberIdx + 1]}-${splitUrl[numberIdx + 2]}`
      // const date = `${splitUrl[3]}-${splitUrl[4]}-${splitUrl[5]}`;
      conn.query("INSERT INTO articles (category_id, title, body, url, created_at) VALUES (?, ?, ?, ?, ?)", [topRankArticle.id, article.title, article.url, article.body, date], (err, rows) => {
        if (err) throw err;
      });
    });
  });
  console.log("end");
});
