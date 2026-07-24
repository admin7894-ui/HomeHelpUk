const fs = require('fs');
const path = require('path');
const { calculateServicePrice } = require('../mobile/src/utils/pricingEngine');

const categoriesPath = path.join(__dirname, '../server/data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

let homeCookService = null;
categories.forEach(cat => {
  cat.subcategories?.forEach(sub => {
    sub.services?.forEach(s => {
      if (s.id === 'service_home_cook') {
        homeCookService = s;
      }
    });
  });
});

console.log('=== STORED HOME COOK SERVICE OBJECT ===');
console.log(JSON.stringify(homeCookService, null, 2));

console.log('\n=== CALCULATION AT 4 PERSONS ===');
const rules = homeCookService.pricingRules || {};
const calc4 = calculateServicePrice({
  basePrice: homeCookService.price,
  quantity: 4,
  pricingRules: rules
});
console.log('4 Persons Result:', calc4);

console.log('\n=== CALCULATION AT 5 PERSONS ===');
const calc5 = calculateServicePrice({
  basePrice: homeCookService.price,
  quantity: 5,
  pricingRules: rules
});
console.log('5 Persons Result:', calc5);
