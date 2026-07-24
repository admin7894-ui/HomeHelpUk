const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../server/data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

let updatedCount = 0;

categories.forEach(cat => {
  cat.subcategories?.forEach(sub => {
    sub.services?.forEach(s => {
      if (s.pricingRules && s.pricingRules.additionalUnitPrice !== undefined) {
        if (s.additionalCharge !== s.pricingRules.additionalUnitPrice) {
          s.additionalCharge = s.pricingRules.additionalUnitPrice;
          updatedCount++;
        }
      }
    });
  });
});

fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
console.log(`Successfully synchronized additionalCharge with pricingRules.additionalUnitPrice across ${updatedCount} services!`);
