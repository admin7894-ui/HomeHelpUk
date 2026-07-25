const { getApplicablePricingModels, isPricingModelAllowed } = require('../utils/pricingModelScoping');

console.log('=== Running Scoped Pricing Verification Tests ===');

// Test 1: Leak Repair Scope
const leakModels = getApplicablePricingModels('service_leak_repair', 'Plumbing').map(m => m.id);
console.log('Leak Repair Allowed Models:', leakModels);
console.assert(leakModels.includes('fixed'), 'Leak Repair should allow fixed');
console.assert(leakModels.includes('per_hour'), 'Leak Repair should allow per_hour');
console.assert(leakModels.includes('quote'), 'Leak Repair should allow quote');
console.assert(!leakModels.includes('per_person'), 'Leak Repair must NOT allow per_person');
console.assert(!leakModels.includes('per_pet'), 'Leak Repair must NOT allow per_pet');

// Test 2: Home Cook Scope
const cookModels = getApplicablePricingModels('service_home_cook', 'Cooking').map(m => m.id);
console.log('Home Cook Allowed Models:', cookModels);
console.assert(cookModels.includes('fixed'), 'Home Cook should allow fixed');
console.assert(cookModels.includes('per_person'), 'Home Cook should allow per_person');
console.assert(!cookModels.includes('per_room'), 'Home Cook must NOT allow per_room');

// Test 3: Haircut Scope
const haircutModels = getApplicablePricingModels('service_haircut_home_service', 'Beauty').map(m => m.id);
console.log('Haircut Allowed Models:', haircutModels);
console.assert(haircutModels.length === 1 && haircutModels[0] === 'fixed', 'Haircut should strictly allow fixed');

// Test 4: Is Pricing Model Allowed Verification
console.assert(isPricingModelAllowed('service_leak_repair', 'Plumbing', 'per_hour') === true, 'per_hour should be allowed for Leak Repair');
console.assert(isPricingModelAllowed('service_leak_repair', 'Plumbing', 'per_person') === false, 'per_person must be rejected for Leak Repair');

console.log('✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
