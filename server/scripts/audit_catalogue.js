const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

let totalServices = 0;
let servicesPerCategory = {};
let duplicates = [];
let defaultPricingServices = [];
let missingPricingFields = [];

const allServiceIds = new Set();
const allServiceNames = new Set();

categories.forEach(cat => {
  let count = 0;
  (cat.subcategories || []).forEach(sub => {
    (sub.services || []).forEach(srv => {
      count++;
      
      // check duplicates
      if (allServiceIds.has(srv.id) || allServiceNames.has(srv.name.toLowerCase())) {
        duplicates.push(srv.name);
      }
      allServiceIds.add(srv.id);
      allServiceNames.add(srv.name.toLowerCase());
      
      // check if it's one of the newly added ones from the 40 list (we used default 45)
      if (srv.price === 45 && srv.description === srv.name && srv.ukTypicalPrice === "£40–£60") {
        defaultPricingServices.push(srv.name);
      }
      
      // check missing fields
      const requiredFields = [
        "ukTypicalPrice", "londonPrice", "mvpPrice", "canaryWharfPrice",
        "unit", "baseIncludes", "additionalCharge", "maxQuantity",
        "pricingRule", "certification", "mvp", "notes"
      ];
      
      let missing = false;
      // Note: older services won't have these, but we just want to flag if any newly added ones are missing them
      // Actually we need to check if it's missing for the 60 services (19 cooking + 41 others)
      if (cat.name === 'Cooking' || defaultPricingServices.includes(srv.name)) {
         for (const f of requiredFields) {
           if (srv[f] === undefined) {
             missing = true;
           }
         }
      }
      if (missing) {
        missingPricingFields.push(srv.name);
      }
      
    });
  });
  servicesPerCategory[cat.name] = count;
  totalServices += count;
});

const report = {
  categoryNames: categories.map(c => c.name),
  cookingIndexZero: categories[0].name === 'Cooking',
  totalServices,
  servicesPerCategory,
  duplicates,
  defaultPricingServicesCount: defaultPricingServices.length,
  missingPricingFieldsCount: missingPricingFields.length,
};

console.log(JSON.stringify(report, null, 2));
