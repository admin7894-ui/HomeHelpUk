const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

let cleanedCount = 0;

categories.forEach(cat => {
  if (cat.subcategories) {
    cat.subcategories.forEach(sub => {
      if (sub.services) {
        sub.services = sub.services.map(srv => {
          if (Array.isArray(srv.whatsIncluded)) {
            const originalLength = srv.whatsIncluded.length;
            srv.whatsIncluded = srv.whatsIncluded.filter(item => {
              const str = String(item).toLowerCase().trim();
              // Remove hardcoded "1-4 persons", "1–4 persons", "up to X persons" lines
              if (str.match(/^1[–-]4\s*persons?$/) || str.match(/includes?\s*\d+[-–]\d+\s*p/)) {
                return false;
              }
              return true;
            });
            if (srv.whatsIncluded.length < originalLength) {
              cleanedCount++;
            }
          }
          return srv;
        });
      }
    });
  }
});

fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8');
console.log(`Cleaned hardcoded inclusion strings from ${cleanedCount} services in categories.json successfully!`);
