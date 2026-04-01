const axios = require('axios');
const cheerio = require('cheerio');

const meta = {
  name: "mangasearch",
  desc: "Searches for manga on MyAnimeList based on a query parameter",
  method: "get",
  category: "manga",
  path: "/mangasearch?query="
};

async function onStart({ res, req }) {
  const searchQuery = req.query.query;
  if (!searchQuery) throw new Error("Please provide a search query using the 'query' parameter.");

  const url = `https://myanimelist.net/manga.php?q=${encodeURIComponent(searchQuery)}&cat=manga`;
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const mangaList = [];

  $('table tbody tr').each((_, element) => {
    const imageUrl = $(element).find('td:nth-child(1) img').attr('data-src')
      || $(element).find('td:nth-child(1) img').attr('src');
    const title = $(element).find('td:nth-child(2) strong').text().trim();
    const link = $(element).find('td:nth-child(2) a').attr('href');
    const type = $(element).find('td:nth-child(3)').text().trim();
    const vol = $(element).find('td:nth-child(4)').text().trim();
    const score = $(element).find('td:nth-child(5)').text().trim();
    const description = $(element).find('td:nth-child(2) .pt4').text().replace('read more.', '').trim() || 'No Desc';

    if (title && link) mangaList.push({ title, description, type, vol, score, imageUrl, link });
  });

  res.json(mangaList);
}

module.exports = { meta, onStart };
