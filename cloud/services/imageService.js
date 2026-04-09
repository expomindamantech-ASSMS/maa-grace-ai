// cloud/services/imageService.js
const https = require('https');

async function searchPexels(query, perPage) {
  return new Promise((resolve, reject) => {
    const key = process.env.PEXELS_API_KEY;
    const q = encodeURIComponent(query);
    const n = perPage || 20;
    const options = {
      hostname: 'api.pexels.com',
      path: `/v1/search?query=${q}&per_page=${n}&orientation=landscape`,
      method: 'GET',
      headers: { Authorization: key }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          const photos = (data.photos || []).map(p => ({
            id: p.id,
            url: p.src.large,
            thumb: p.src.medium,
            small: p.src.small,
            photographer: p.photographer,
            alt: p.alt
          }));
          resolve(photos);
        } catch(e) { reject(new Error('Pexels API error')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = { searchPexels };
