const axios = require("axios");
const cheerio = require("cheerio");

const meta = {
  name: "Manga Info",
  desc: "Fetches detailed manga information from MyAnimeList based on a provided URL",
  method: "get",
  category: "manga",
  path: "/mangainfo?url=" // Expects query parameter: ?url=your_manga_url
};

async function onStart({ res, req }) {
  try {
    const mangaUrl = req.query.url;
    if (!mangaUrl) {
      throw new Error("Please provide a manga URL using the 'url' query parameter.");
    }

    const { data } = await axios.get(mangaUrl);
    const $ = cheerio.load(data);

    const title = $('span.h1-title span[itemprop="name"]').text().trim();
    const imageUrl = $(".leftside img").attr("data-src");
    const synopsis = $('span[itemprop="description"]').text().trim();
    const background = $('td.pb24:contains("Background")')
      .contents()
      .map(function() {
        if (this.type === 'text') {
          return $(this).text();
        } else if (this.name === 'i') {
          return $(this).text();
        }
      })
      .get()
      .join('')
      .trim();

    const alternativeTitles = {
      synonyms: $('.spaceit_pad:contains("Synonyms")')
        .contents()
        .not('span')
        .text()
        .trim(),
      japanese: $('.spaceit_pad:contains("Japanese")')
        .contents()
        .not('span')
        .text()
        .trim(),
      english: $('.spaceit_pad:contains("English")')
        .contents()
        .not('span')
        .text()
        .trim(),
    };

    const information = {
      type: $('.spaceit_pad:contains("Type") a').text().trim(),
      volumes: $('.spaceit_pad:contains("Volumes")')
        .contents()
        .not('span')
        .text()
        .trim(),
      chapters: $('.spaceit_pad:contains("Chapters")')
        .contents()
        .not('span')
        .text()
        .trim(),
      status: $('.spaceit_pad:contains("Status")')
        .contents()
        .not('span')
        .text()
        .trim(),
      published: $('.spaceit_pad:contains("Published")')
        .contents()
        .not('span')
        .text()
        .trim(),
      genres: $("span:contains('Genres:')")
        .nextAll("a")
        .map((i, el) => $(el).text().trim())
        .get()
        .join(', ') || 'None',
      themes: $("span:contains('Themes:')")
        .nextAll("a")
        .map((i, el) => $(el).text().trim())
        .get()
        .join(', ') || 'None',
      demographic: $("span:contains('Demographic:')")
        .nextAll("a")
        .map((i, el) => $(el).text().trim())
        .get()
        .join(', ') || 'None',
      serialization: $("span:contains('Serialization:')")
        .nextAll("a")
        .map((i, el) => $(el).text().trim())
        .get()
        .join(', ') || 'None',
      authors: $("span:contains('Authors:')")
        .nextAll("a")
        .map((i, el) => $(el).text().trim())
        .get()
        .join(', ') || 'Unknown',
    };

    const element = $('.spaceit_pad').filter((_, el) => {
      return $(el).find('span.dark_text').text().trim() === 'Ranked:';
    });
    const rankedText = element
      .contents()
      .filter((_, el) => el.type === 'text')
      .text()
      .trim();

    const statistics = {
      score: $('span[itemprop="ratingValue"]').text().trim(),
      ranked: rankedText,
      popularity: $('.spaceit_pad:contains("Popularity")')
        .contents()
        .not('span')
        .text()
        .trim(),
      members: $('.spaceit_pad:contains("Members")')
        .contents()
        .not('span')
        .text()
        .trim(),
      favorites: $('.spaceit_pad:contains("Favorites")')
        .contents()
        .not('span')
        .text()
        .trim(),
    };

    const externalLinks = $(".external_links a")
      .map((i, el) => {
        const name = $(el).find(".caption").text().trim();
        const url = $(el).attr("href");
        if (name && url) {
          return { name, url };
        }
      })
      .get();

    const mangaData = {
      title,
      synopsis,
      background,
      alternativeTitles,
      information,
      statistics,
      externalLinks,
      imageUrl,
      link: mangaUrl
    };

    res.end(JSON.stringify(mangaData));
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.end(JSON.stringify({ error: error.message }));
  }
}

module.exports = { meta, onStart };