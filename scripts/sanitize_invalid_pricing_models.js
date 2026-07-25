const fs = require('fs');
const path = require('path');
const { getApplicablePricingModels, isPricingModelAllowed } = require('../utils/pricingModelScoping');

const categoriesPath = path.join(__dirname, '../data/categories.json');
const providersPath = path.join(__dirname, '../data/providers.json');

const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
const providers = JSON.parse(fs.readFileSync(providersPath, 'utf-8'));

let sanitizedCatCount = 0;
let sanitizedProvCount = 0;

// 1. Sanitize categories.json
categories.forEach(cat => {
  if (cat.subcategories) {
    cat.subcategories.forEach(sub => {
      if (sub.services) {
        sub.services = sub.services.map(srv => {
          if (srv.pricingRules && srv.pricingRules.pricingModel) {
            const allowed = isPricingModelAllowed(srv.id, cat.name, srv.pricingRules.pricingModel);
            if (!allowed) {
              console.log(`[Sanitizing Category Service] Service '${srv.name}' (${srv.id}) in category '${cat.name}' had invalid model '${srv.pricingRules.pricingModel}'. Resetting.`);
              const validModels = getApplicablePricingModels(srv.id, cat.name);
              srv.pricingRules.pricingModel = validModels[0].id;
              srv.pricingRules.includedUnit = validModels[0].unit;
              srv.pricingRules.additionalUnit = validModels[0].unit;
              sanitizedCatCount++;
            }
          }
          return srv;
        });
      }
    });
  }
});

fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8');

// 2. Sanitize providers.json
providers.forEach(prov => {
  if (Array.isArray(prov.services)) {
    prov.services = prov.services.map(ps => {
      if (typeof ps !== 'string' && ps.pricingRules && ps.pricingRules.pricingModel) {
        // Find main category
        let catName = null;
        for (const cat of categories) {
          if (cat.subcategories) {
            for (const sub of cat.subcategories) {
              if (sub.services && sub.services.some(s => s.id === ps.serviceId)) {
                catName = cat.name;
                break;
              }
            }
          }
        }
        const allowed = isPricingModelAllowed(ps.serviceId, catName, ps.pricingRules.pricingModel);
        if (!allowed) {
          console.log(`[Sanitizing Provider Override] Provider '${prov.name}' (${prov.id}) service '${ps.serviceId}' had invalid model '${ps.pricingRules.pricingModel}'. Resetting.`);
          const validModels = getApplicablePricingModels(ps.serviceId, catName);
          ps.pricingRules.pricingModel = validModels[0].id;
          ps.pricingRules.includedUnit = validModels[0].unit;
          ps.pricingRules.additionalUnit = validModels[0].unit;
          sanitizedProvCount++;
        }
      }
      return ps;
    });
  }
});

fs.writeFileSync(providersPath, JSON.stringify(providers, null, 2), 'utf-8');

console.log(`Sanitation complete!`);
console.log(`Sanitized Category Services: ${sanitizedCatCount}`);
console.log(`Sanitized Provider Overrides: ${sanitizedProvCount}`);
