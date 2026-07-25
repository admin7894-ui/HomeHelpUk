const fs = require('fs');
const path = require('path');

const providersPath = path.join(__dirname, '../data/providers.json');
const providers = JSON.parse(fs.readFileSync(providersPath, 'utf-8'));

let cleanedProvCount = 0;

providers.forEach(prov => {
  if (Array.isArray(prov.services)) {
    prov.services.forEach(ps => {
      if (typeof ps !== 'string' && Array.isArray(ps.customWhatsIncluded)) {
        const origLen = ps.customWhatsIncluded.length;
        ps.customWhatsIncluded = ps.customWhatsIncluded.filter(item => {
          const str = String(item).toLowerCase().trim();
          if (str.match(/^1[–-]4\s*persons?$/) || str.match(/includes?\s*\d+[-–]\d+\s*p/)) {
            return false;
          }
          return true;
        });
        if (ps.customWhatsIncluded.length < origLen) {
          cleanedProvCount++;
        }
      }
    });
  }
});

fs.writeFileSync(providersPath, JSON.stringify(providers, null, 2), 'utf-8');
console.log(`Cleaned hardcoded inclusion strings from ${cleanedProvCount} provider service records in providers.json successfully!`);
