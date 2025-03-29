const axios = require('axios');
const cheerio = require('cheerio');

const meta = {
  name: "mangaSearch",
  version: "1.0.0",
  description: "Searches for manga on MyAnimeList based on a query parameter",
  author: "Rynn",
  method: "get",
  category: "manga",
  path: "/mangasearch?query=" // Expects query parameter: ?query=your_search_term
};

async function onStart({ res, req }) {
  try {
    const searchQuery = req.query.query;
    if (!searchQuery) {
      throw new Error("Please provide a search query using the 'query' parameter.");
    }

    const url = `https://myanimelist.net/manga.php?q=${encodeURIComponent(searchQuery)}&cat=manga`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let mangaList = [];

    $('table tbody tr').each((_, element) => {
      const imageUrl = $(element)
        .find('td:nth-child(1) img')
        .attr('data-src') || $(element)
        .find('td:nth-child(1) img')
        .attr('src');
      const title = $(element)
        .find('td:nth-child(2) strong')
        .text()
        .trim();
      const link = $(element)
        .find('td:nth-child(2) a')
        .attr('href');
      const type = $(element)
        .find('td:nth-child(3)')
        .text()
        .trim();
      const vol = $(element)
        .find('td:nth-child(4)')
        .text()
        .trim();
      const score = $(element)
        .find('td:nth-child(5)')
        .text()
        .trim();
      const description = $(element)
        .find('td:nth-child(2) .pt4')
        .text()
        .replace('read more.', '')
        .trim() || 'No Desc';

      if (title && link) {
        mangaList.push({
          title,
          description,
          type,
          vol,
          score,
          imageUrl,
          link
        });
      }
    });

    res.end(JSON.stringify(mangaList));
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.end(JSON.stringify({ error: error.message }));
  }
}

module.exports = { meta, onStart };
