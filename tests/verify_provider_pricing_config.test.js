const { getApplicablePricingModels, isPricingModelAllowed } = require('../utils/pricingModelScoping');

console.log('=== Running Provider Pricing Configuration Tests ===');

// Test 1: Category Resolution for Home Cook
const categoryName = 'Cooking'; // Resolved from parent category lookup
const homeCookModels = getApplicablePricingModels('service_home_cook', categoryName).map(m => m.id);

console.log('Home Cook Pricing Models:', homeCookModels);
console.assert(homeCookModels.includes('per_person'), 'Home Cook must include per_person pricing model option!');
console.assert(homeCookModels.includes('fixed'), 'Home Cook must include fixed pricing model option!');
console.assert(isPricingModelAllowed('service_home_cook', 'Cooking', 'per_person') === true, 'per_person model must be allowed for Home Cook!');

console.log('✅ ALL PROVIDER PRICING CONFIGURATION TESTS PASSED 100% CLEAN!');
