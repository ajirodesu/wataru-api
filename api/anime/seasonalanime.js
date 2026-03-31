const axios = require('axios');
const cheerio = require('cheerio');

const meta = {
  name: "Seasonal Anime",
  desc: "Fetches seasonal anime from MyAnimeList based on season and type",
  method: "get",
  category: "anime",
  path: "/seasonalanime?season=fall&type=tv-new"
};

async function onStart({ res, req }) {
  try {
    // Get season and type from query parameters (defaults provided)
    const { season = 'fall', type = 'tv-new' } = req.query;

    const validType = {
      'tv-new': 'TV (New)',
      'tv-continuing': 'TV (Continuing)',
      'ona': 'ONA',
      'ova': 'OVA',
      'movie': 'Movie',
      'special': 'Special'
    };
    const normalizedType = type.toLowerCase();
    if (!validType[normalizedType]) {
      throw new Error('Type ga valid. Pilih salah satu dari: ' + Object.keys(validType).join(', '));
    }

    const validSeasons = ['fall', 'spring', 'winter', 'summer'];
    const normalizedSeason = season.toLowerCase();
    if (!validSeasons.includes(normalizedSeason)) {
      throw new Error('Season ga valid. Pilih salah satu dari: ' + validSeasons.join(', '));
    }

    // Construct URL (the year is hardcoded as 2024)
    const baseUrl = `https://myanimelist.net/anime/season/2024/${normalizedSeason}`;
    const { data } = await axios.get(baseUrl);
    const $ = cheerio.load(data);

    const animeList = [];

    $('.seasonal-anime-list').each((_, list) => {
      const typeTxt = $(list).find('.anime-header').text().trim();

      $(list).find('.js-seasonal-anime').each((_, element) => {
        const title = $(element).find('.h2_anime_title > a').text().trim();
        const link = $(element).find('.h2_anime_title > a').attr('href');
        const imageUrl = $(element).find('.image > a > img').attr('src') || $(element).find('.image > a > img').attr('data-src');
        const score = $(element).find('.js-score').text().trim();
        const members = $(element).find('.js-members').text().trim();
        const formattedMembers = Number(members.replace(/\D/g, '')).toLocaleString('en-US');

        const infoDiv = $(element).find('.info');
        const releaseDate = infoDiv.find('.item:first-child').text().trim();
        const totalEps = infoDiv.find('.item:nth-child(2) span:first-child').text().trim();
        const duration = infoDiv.find('.item:nth-child(2) span:nth-child(2)').text().trim();
        const totalEpsWithDuration = `${totalEps}, ${duration}`;

        const synopsis = $(element).find('.synopsis p').text().trim();

        const studio = $(element).find('.property:contains("Studio") .item').text().trim();
        const source = $(element).find('.property:contains("Source") .item').text().trim();
        const themes = $(element).find('.property:contains("Themes") .item').map((_, theme) => $(theme).text().trim()).get().join(', ');
        const genres = $(element).find('.genres .genre a').map((_, g) => $(g).text().trim()).get().join(', ');

        animeList.push({
          title,
          type: typeTxt || 'Unknown',
          link,
          imageUrl,
          stats: {
            score: score || 'N/A',
            members: formattedMembers || 'N/A'
          },
          details: {
            releaseDate: releaseDate || 'Unknown',
            totalEpisodes: totalEpsWithDuration || 'Unknown',
            studio: studio || 'Unknown',
            source: source || 'Unknown'
          },
          tags: {
            themes: themes || 'None',
            genres: genres || 'None'
          },
          synopsis: synopsis
        });
      });
    });

    // Filter animeList based on the provided type
    const grouped = animeList.filter(obj => obj.type === validType[normalizedType]);
    res.end(JSON.stringify(grouped));
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.end(JSON.stringify({ error: error.message }));
  }
}

module.exports = { meta, onStart };