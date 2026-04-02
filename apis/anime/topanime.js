const axios = require('axios');
const cheerio = require('cheerio');

const meta = {
  name: "Top Anime",
  desc: "Fetches top anime from MyAnimeList",
  method: "get",
  category: "anime",
  path: "/topanime"
};

async function onStart({ res }) {
  const response = await axios.get('https://myanimelist.net/topanime.php');
  const $ = cheerio.load(response.data);
  const animeList = [];

  $('.ranking-list').each((_, element) => {
    const info = $(element).find('.information').text().split('\n');
    animeList.push({
      rank: $(element).find('.rank').text().trim(),
      title: $(element).find('.title h3 a').text().trim(),
      score: $(element).find('.score span').text().trim(),
      type: info[1]?.trim(),
      release: info[2]?.trim(),
      members: info[3]?.trim(),
      thumbnail: $(element).find('.title img').attr('data-src'),
      link: $(element).find('.title h3 a').attr('href'),
    });
  });

  res.json(animeList);
}

module.exports = { meta, onStart };
