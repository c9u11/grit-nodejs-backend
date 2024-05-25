const axios = require("axios");
const cheerio = require("cheerio");

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
      const startIdx = html.indexOf(`"chartbeat-toppages":{`);
      let endIdx = 0;
      const stack = ["{"];
      for (let i = startIdx + 22; i < html.length; i++) {
        if (stack.length === 0) {
          endIdx = i;
          break;
        }
        if (html[i] === "{") {
          stack.push("{");
        } else if (html[i] === "}") {
          stack.pop();
        }
      }
      const jsonString = html.slice(startIdx + 21, endIdx);
      const json = JSON.parse(jsonString);
      const charts = json[Object.keys(json)[0]].data.content_elements;
      const result = charts.map((chart) => {
        return {
          title: chart.headlines.basic,
          url: chart.website_url,
        };
      });
      data.articles = result;
    }
    return datas;
  } catch (error) {
    console.error(error);
  }
};

getTopRankArticle().then((topRankArticles) => {
  console.log(topRankArticles);
});