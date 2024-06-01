const axios = require("axios");
const cheerio = require("cheerio");

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
      { category: "politics", articles: [] },
      { category: "national", articles: [] },
      { category: "international", articles: [] },
      { category: "medical", articles: [] },
      { category: "sports", articles: [] },
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
  console.log(JSON.stringify(topRankArticles));
});