const axios = require('axios');
const cheerio = require('cheerio');

const meta = {
  name: "Chara Info",
  desc: "Fetches detailed character information from MyAnimeList based on a provided URL",
  method: "get",
  category: "anime",
  path: "/charaInfo?url=" // Expects query parameter: ?url=character_url
};

async function onStart({ res, req }) {
  try {
    const characterUrl = req.query.url;
    if (!characterUrl) {
      throw new Error("Please provide a character URL using the 'url' query parameter.");
    }

    const { data } = await axios.get(characterUrl);
    const $ = cheerio.load(data);

    const name = $('h2.normal_header').first().text().trim();
    const description = $('h2.normal_header').closest('td').clone().children().remove().end().text().trim();
    const thumbnail = $('img.portrait-225x350').attr('data-src') || $('img.portrait-225x350').attr('src');

    const animeography = [];
    $('td.borderClass').each((i, el) => {
      const animeTitle = $(el).find('a[href*="https://myanimelist.net/anime/"]').text().trim();
      const animeLink = $(el).find('a[href*="https://myanimelist.net/anime/"]').attr('href');
      if (animeTitle && animeLink) {
        animeography.push({ title: animeTitle, link: animeLink });
      }
    });

    const mangaography = [];
    $('td.borderClass').each((i, el) => {
      const mangaTitle = $(el).find('a[href*="https://myanimelist.net/manga/"]').text().trim();
      const mangaLink = $(el).find('a[href*="https://myanimelist.net/manga/"]').attr('href');
      if (mangaTitle && mangaLink) {
        mangaography.push({ title: mangaTitle, link: mangaLink });
      }
    });

    const voiceActors = [];
    $('div.voice_actor').find('tr').each((i, el) => {
      const vaName = $(el).find('td:nth-child(2) a').text().trim();
      const vaImage = $(el).find('td:nth-child(1) img').attr('data-src') || $(el).find('td:nth-child(1) img').attr('src');
      const vaRole = $(el).find('td:nth-child(3)').text().trim();
      if (vaName && vaImage) {
        voiceActors.push({ name: vaName, role: vaRole, image: vaImage });
      }
    });

    res.end(JSON.stringify({
      name,
      description,
      thumbnail,
      animeography,
      mangaography,
      voiceActors
    }));
  } catch (error) {
    console.error('Error scraping character:', error.message);
    res.end(JSON.stringify({ error: error.message }));
  }
}

module.exports = { meta, onStart };