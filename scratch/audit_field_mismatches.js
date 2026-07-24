const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../server/data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

const fieldMismatches = [];

categories.forEach(cat => {
  cat.subcategories?.forEach(sub => {
    sub.services?.forEach(s => {
      const topAddCharge = s.additionalCharge;
      const ruleAddPrice = s.pricingRules?.additionalUnitPrice;

      if (topAddCharge !== undefined && ruleAddPrice !== undefined && topAddCharge !== ruleAddPrice) {
        fieldMismatches.push({
          serviceId: s.id,
          serviceName: s.name,
          category: cat.name,
          topLevel_additionalCharge: topAddCharge,
          pricingRules_additionalUnitPrice: ruleAddPrice
        });
      }
    });
  });
});

console.log('=== FIELD MISMATCHES AUDIT ===');
console.log(`Found ${fieldMismatches.length} services with mismatched additional charge fields:`);
console.log(JSON.stringify(fieldMismatches, null, 2));
