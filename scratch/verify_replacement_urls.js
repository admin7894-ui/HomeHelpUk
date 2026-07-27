const https = require('https');

const replacements = [
  "https://images.unsplash.com/photo-1589923188900-85dae523342b?w=1000&q=80", // Lawn mowing
  "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=1000&q=80", // Garden cleaning
  "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1000&q=80", // Continental pasta
  "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&q=80", // Light fixture
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1000&q=80"  // Spa waxing
];

const checkUrl = (url) => {
  return new Promise((resolve) => {
    const req = https.get(url, { method: 'HEAD' }, (res) => {
      resolve({ url, status: res.statusCode });
    });
    req.on('error', (err) => resolve({ url, status: 'ERROR', error: err.message }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ url, status: 'TIMEOUT' }); });
  });
};

async function test() {
  const results = await Promise.all(replacements.map(checkUrl));
  results.forEach(r => console.log(`[Status ${r.status}]: ${r.url}`));
}

test();
