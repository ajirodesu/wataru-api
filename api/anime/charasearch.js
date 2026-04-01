const axios = require('axios');
const cheerio = require('cheerio');

const meta = {
  name: "Chara Search",
  desc: "Searches for characters on MyAnimeList based on a query parameter",
  method: "get",
  category: "anime",
  path: "/charasearch?query="
};

async function onStart({ res, req }) {
  const searchQuery = req.query.query;
  if (!searchQuery) throw new Error("Please provide a search query using the 'query' parameter.");

  const url = `https://myanimelist.net/character.php?q=${encodeURIComponent(searchQuery)}&cat=character`;
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const characterData = [];

  $('table tbody tr').each((_, element) => {
    const imageUrl = $(element).find('td .picSurround img').attr('data-src')
      || $(element).find('td .picSurround img').attr('src');
    const nameElement = $(element).find('td:nth-child(2) a');
    const name = nameElement.text().trim();
    const link = nameElement.attr('href') || '';
    const animeList = [];
    const mangaList = [];

    $(element).find('td small a[href*="/anime/"]').each((_, anime) => {
      animeList.push({ title: $(anime).text().trim(), link: `https://myanimelist.net${$(anime).attr('href')}` });
    });
    $(element).find('td small a[href*="/manga/"]').each((_, manga) => {
      mangaList.push({ title: $(manga).text().trim(), link: `https://myanimelist.net${$(manga).attr('href')}` });
    });

    if (name && link) characterData.push({ name, anime: animeList, manga: mangaList, imageUrl, link });
  });

  res.json(characterData);
}

module.exports = { meta, onStart };
