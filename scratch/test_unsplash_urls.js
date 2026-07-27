const https = require('https');
const { SERVICE_MEDIA_CATALOG, CATEGORY_MEDIA_FALLBACKS } = require('../mobile/src/utils/serviceImages');

console.log('=== TESTING HTTP STATUS OF ALL UNSPLASH URLS IN CATALOG ===\n');

const urlsToTest = new Set();

Object.entries(SERVICE_MEDIA_CATALOG).forEach(([srvId, data]) => {
  if (data.cover) urlsToTest.add(data.cover);
  if (Array.isArray(data.gallery)) {
    data.gallery.forEach(g => urlsToTest.add(g));
  }
});

Object.values(CATEGORY_MEDIA_FALLBACKS).forEach(url => urlsToTest.add(url));

console.log(`Found ${urlsToTest.size} unique URLs to test...\n`);

const checkUrl = (url) => {
  return new Promise((resolve) => {
    const req = https.get(url, { method: 'HEAD' }, (res) => {
      resolve({ url, status: res.statusCode });
    });
    req.on('error', (err) => {
      resolve({ url, status: 'ERROR', error: err.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ url, status: 'TIMEOUT' });
    });
  });
};

async function run() {
  const results = await Promise.all(Array.from(urlsToTest).map(checkUrl));
  let brokenCount = 0;
  results.forEach(r => {
    if (r.status !== 200 && r.status !== 302 && r.status !== 301) {
      console.log(`❌ BROKEN URL [Status ${r.status}]: ${r.url}`);
      brokenCount++;
    } else {
      console.log(`✅ OK [${r.status}]: ${r.url.substring(0, 55)}...`);
    }
  });

  console.log(`\nSummary: ${results.length - brokenCount} OK, ${brokenCount} Broken.`);
}

run();
