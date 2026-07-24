const fs = require('fs');
const path = require('path');

const providersPath = path.join(__dirname, '../server/data/providers.json');
const providers = JSON.parse(fs.readFileSync(providersPath, 'utf-8'));

console.log('=== REGISTERED PROVIDERS AUDIT ===');
console.log(`Total Registered Providers: ${providers.length}\n`);

providers.forEach(p => {
  console.log(`Provider ID: ${p.id}`);
  console.log(`Name: ${p.name}`);
  console.log(`Avatar: ${p.avatar}`);
  console.log(`Rating: ${p.rating || 'N/A'} (${p.reviewCount || 0} reviews)`);
  console.log(`Categories:`, p.categories);
  const activeServices = (p.services || []).filter(s => typeof s === 'string' ? true : s.enabled !== false);
  console.log(`Active Services Count: ${activeServices.length}`);
  console.log(`Active Service IDs:`, activeServices.map(s => typeof s === 'string' ? s : s.serviceId));
  console.log('--------------------------------------------------');
});
