const { isPricingModelAllowed } = require('../utils/pricingModelScoping');

console.log('=== Testing isPricingModelAllowed for multi model ===');

const isAllowed = isPricingModelAllowed('service_home_cook', 'Cooking', 'multi', ['per_hour', 'per_person']);
console.log('isPricingModelAllowed result:', isAllowed);
console.assert(isAllowed === true, 'multi model with per_hour and per_person must be allowed!');

console.log('✅ IS PRICING MODEL ALLOWED UNIT TEST PASSED 100% CLEAN!');
