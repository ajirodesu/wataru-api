const axios = require('axios');
const cheerio = require('cheerio');

const meta = {
  name: "Seasonal Anime",
  desc: "Fetches seasonal anime from MyAnimeList based on season and type",
  method: "get",
  category: "anime",
  path: "/seasonalanime?season=fall&type=tv-new"
};

const VALID_TYPES = {
  'tv-new': 'TV (New)',
  'tv-continuing': 'TV (Continuing)',
  'ona': 'ONA',
  'ova': 'OVA',
  'movie': 'Movie',
  'special': 'Special',
};

const VALID_SEASONS = ['fall', 'spring', 'winter', 'summer'];

async function onStart({ res, req }) {
  const { season = 'fall', type = 'tv-new' } = req.query;
  const normalizedType = type.toLowerCase();
  const normalizedSeason = season.toLowerCase();

  if (!VALID_TYPES[normalizedType]) throw new Error('Invalid type. Choose from: ' + Object.keys(VALID_TYPES).join(', '));
  if (!VALID_SEASONS.includes(normalizedSeason)) throw new Error('Invalid season. Choose from: ' + VALID_SEASONS.join(', '));

  const { data } = await axios.get(`https://myanimelist.net/anime/season/2024/${normalizedSeason}`);
  const $ = cheerio.load(data);
  const animeList = [];

  $('.seasonal-anime-list').each((_, list) => {
    const typeTxt = $(list).find('.anime-header').text().trim();

    $(list).find('.js-seasonal-anime').each((_, element) => {
      const title = $(element).find('.h2_anime_title > a').text().trim();
      const link = $(element).find('.h2_anime_title > a').attr('href');
      const imageUrl = $(element).find('.image > a > img').attr('src') || $(element).find('.image > a > img').attr('data-src');
      const score = $(element).find('.js-score').text().trim();
      const members = Number($(element).find('.js-members').text().trim().replace(/\D/g, '')).toLocaleString('en-US');
      const infoDiv = $(element).find('.info');
      const totalEps = infoDiv.find('.item:nth-child(2) span:first-child').text().trim();
      const duration = infoDiv.find('.item:nth-child(2) span:nth-child(2)').text().trim();
      const studio = $(element).find('.property:contains("Studio") .item').text().trim();
      const source = $(element).find('.property:contains("Source") .item').text().trim();
      const themes = $(element).find('.property:contains("Themes") .item').map((_, t) => $(t).text().trim()).get().join(', ');
      const genres = $(element).find('.genres .genre a').map((_, g) => $(g).text().trim()).get().join(', ');

      animeList.push({
        title,
        type: typeTxt || 'Unknown',
        link,
        imageUrl,
        stats: { score: score || 'N/A', members: members || 'N/A' },
        details: {
          releaseDate: infoDiv.find('.item:first-child').text().trim() || 'Unknown',
          totalEpisodes: `${totalEps}, ${duration}` || 'Unknown',
          studio: studio || 'Unknown',
          source: source || 'Unknown',
        },
        tags: { themes: themes || 'None', genres: genres || 'None' },
        synopsis: $(element).find('.synopsis p').text().trim(),
      });
    });
  });

  res.json(animeList.filter(obj => obj.type === VALID_TYPES[normalizedType]));
}

module.exports = { meta, onStart };
