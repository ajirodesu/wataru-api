const axios = require('axios');
const cheerio = require('cheerio');

const meta = {
  name: "Top Anime",
  desc: "Fetches top anime from MyAnimeList",
  method: "get",
  category: "anime",
  path: "/topanime"
};

async function onStart({ res, req }) {
  try {
    const response = await axios.get('https://myanimelist.net/topanime.php');
    const $ = cheerio.load(response.data);
    const animeList = [];

    $('.ranking-list').each((_, element) => {
      const rank = $(element).find('.rank').text().trim();
      const title = $(element).find('.title h3 a').text().trim();
      const link = $(element).find('.title h3 a').attr('href');
      const score = $(element).find('.score span').text().trim();
      const thumbnail = $(element).find('.title img').attr('data-src');
      const type = $(element).find('.information').text().split('\n')[1].trim();
      const release = $(element).find('.information').text().split('\n')[2].trim();
      const members = $(element).find('.information').text().split('\n')[3].trim();

      animeList.push({
        rank,
        title,
        score,
        type,
        release,
        members,
        thumbnail,
        link
      });
    });

    res.end(JSON.stringify(animeList));
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.end(JSON.stringify({ error: error.message }));
  }
}

module.exports = { meta, onStart };