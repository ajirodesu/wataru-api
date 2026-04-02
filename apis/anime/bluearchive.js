const axios = require('axios');

const meta = {
  name: "Blue Archive",
  version: "1.0.0",
  description: "Fetches a random Blue Archive image",
  author: "Rynn",
  method: "get",
  category: "anime",
  path: "/ba"
};

async function bluearchive() {
  try {
    const { data } = await axios.get(`https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json`);
    const response = await axios.get(data[Math.floor(data.length * Math.random())], { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    throw error;
  }
}

async function onStart({ req, res }) {
  try {
    const imageBuffer = await bluearchive();
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
    });
    res.end(imageBuffer);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
}

module.exports = { meta, onStart };