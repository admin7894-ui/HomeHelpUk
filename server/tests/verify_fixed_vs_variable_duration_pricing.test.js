const assert = require('assert');
const { calculateServicePrice } = require('../../mobile/src/utils/pricingEngine');
const { getServiceConfig } = require('../../mobile/src/utils/serviceConfig');

console.log('=== VERIFYING FIXED VS VARIABLE DURATION PRICING ENGINE ===\n');

// Test 1: Fixed / Appointment Service (Private Chef)
// Base Price = £19, Duration = 2 hours (Appointment duration). Customer did NOT choose extra hours.
const chefConfig = getServiceConfig('service_home_cook', { id: 'service_home_cook', name: 'Private Chef', price: 19, unit: 'hr' }, { id: 'cat_cooking' });
const chefCalc = calculateServicePrice({
  basePrice: 19,
  durationHours: 2,
  quantity: 1,
  selectedAddons: [],
  serviceUnit: 'hr',
  pricingRules: { pricingModel: 'per_person', includedQuantity: 4, additionalUnitPrice: 10 },
  serviceConfig: chefConfig,
  serviceId: 'service_home_cook'
});

console.log('Private Chef Test Result:', chefCalc);
assert.strictEqual(chefCalc.extraHours, 0, 'Private Chef extra hours should be 0');
assert.strictEqual(chefCalc.extraHoursCost, 0, 'Private Chef extra hours cost should be £0');
assert.strictEqual(chefCalc.subtotal, 19.00, 'Private Chef subtotal should be £19.00');
assert.strictEqual(chefCalc.platformFee, 2.09, 'Private Chef platform fee should be £2.09');
assert.strictEqual(chefCalc.grandTotal, 21.09, 'Private Chef grand total should be £21.09');
console.log('✅ Private Chef (Fixed / Appointment Duration) pricing verified!');

// Test 2: Variable Duration Hourly Service (Furniture Assembly)
// Base Price = £40/hr (1 hr included), Customer selects 3 hours. Extra Hour Rate = £40.
const assemblyConfig = getServiceConfig('service_furniture_assembly', { id: 'service_furniture_assembly', name: 'Furniture Assembly', price: 40, unit: 'hr' }, { id: 'cat_handyman' });
const assemblyCalc = calculateServicePrice({
  basePrice: 40,
  durationHours: 3,
  quantity: 1,
  selectedAddons: [],
  serviceUnit: 'hr',
  pricingRules: { pricingModel: 'per_hour_variable', includedHours: 1, additionalHourPrice: 40 },
  serviceConfig: assemblyConfig,
  serviceId: 'service_furniture_assembly'
});

console.log('\nFurniture Assembly (Variable Duration 3 hrs) Test Result:', assemblyCalc);
assert.strictEqual(assemblyCalc.extraHours, 2, 'Assembly extra hours should be 2');
assert.strictEqual(assemblyCalc.extraHoursCost, 80.00, 'Assembly extra hours cost should be £80 (2 * £40)');
assert.strictEqual(assemblyCalc.subtotal, 120.00, 'Assembly subtotal should be £120 (£40 + £80)');
console.log('✅ Furniture Assembly (Variable Duration) pricing verified!');

console.log('\n🎉 ALL PRICING CALCULATION VERIFICATION TESTS PASSED 100% CLEAN!');
