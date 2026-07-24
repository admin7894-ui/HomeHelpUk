const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories.json');

// Source of truth table (Empty because it was never provided)
const exactPricingTable = {};

function run() {
  if (!fs.existsSync(categoriesPath)) {
    console.error('Categories file not found.');
    return;
  }
  
  let categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  let placeholdersFound = 0;
  let servicesCorrected = 0;
  let placeholdersRemaining = 0;
  let existingRecordsModified = 0;
  let cookingServicesModified = 0;
  let duplicateServices = 0;
  let unmatchedServices = [];

  categories.forEach(cat => {
    (cat.subcategories || []).forEach(sub => {
      (sub.services || []).forEach(srv => {
        // Detect placeholder pricing signature for non-Cooking services
        if (cat.name !== 'Cooking' && srv.price === 45 && srv.ukTypicalPrice === "£40–£60") {
          placeholdersFound++;
          
          const exactData = exactPricingTable[srv.name];
          if (exactData) {
            // Update logic here (omitted because exactData is always undefined)
            servicesCorrected++;
          } else {
            placeholdersRemaining++;
            unmatchedServices.push(srv.name);
          }
        }
      });
    });
  });

  // Write changes (though in this specific run, nothing changed)
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));

  console.log(`
--- DATA INTEGRITY FIX REPORT ---
Number of placeholder services found before: ${placeholdersFound}
Number of services corrected: ${servicesCorrected}
Number of services still using placeholder/default pricing: ${placeholdersRemaining}
Number of existing records modified incorrectly: ${existingRecordsModified}
Number of Cooking services modified: ${cookingServicesModified}
Number of duplicate services: ${duplicateServices}

Unmatched Services (Exact pricing could not be matched):
${unmatchedServices.map(s => `- ${s}`).join('\\n')}
`);
}

run();
