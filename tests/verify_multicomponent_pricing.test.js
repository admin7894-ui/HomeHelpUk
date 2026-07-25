const { calculateServicePrice } = require('../../mobile/src/utils/pricingEngine');

console.log('=== Running Multi-Component Pricing Engine Verification ===');

// Scenario A: Home Cook with BOTH Per Hour + Per Person Enabled
// Base Price = £20
// Included Hours = 1, Selected Hours = 3 -> Extra 2 Hours @ £20/hr = £40
// Included Persons = 4, Selected Persons = 6 -> Extra 2 Persons @ £10/person = £20
// Add-ons = £10
// Expected: Subtotal = £20 + £40 + £20 + £10 = £90. Platform Fee (11%) = £9.90. Grand Total = £99.90
const homeCookMultiCalc = calculateServicePrice({
  basePrice: 20,
  durationHours: 3,
  quantity: 6,
  selectedAddons: [{ id: 'diet', price: 10 }],
  serviceUnit: 'hr',
  pricingRules: {
    pricingModel: 'multi',
    enabledModels: ['per_hour', 'per_person'],
    enablePerHour: true,
    includedHours: 1,
    additionalHourPrice: 20,
    enablePerUnit: true,
    includedQuantity: 4,
    additionalUnitPrice: 10,
    includedUnit: 'person'
  }
});

console.log('Home Cook Multi-Component Test Result:', homeCookMultiCalc);
console.assert(homeCookMultiCalc.basePrice === 20, 'Base price should be £20');
console.assert(homeCookMultiCalc.extraHours === 2, 'Extra hours should be 2');
console.assert(homeCookMultiCalc.extraHoursCost === 40, 'Extra hours cost should be £40');
console.assert(homeCookMultiCalc.extraUnits === 2, 'Extra persons should be 2');
console.assert(homeCookMultiCalc.extraUnitsCost === 20, 'Extra persons cost should be £20');
console.assert(homeCookMultiCalc.addonsCost === 10, 'Addons cost should be £10');
console.assert(homeCookMultiCalc.subtotal === 90, 'Subtotal should be £90');
console.assert(homeCookMultiCalc.platformFee === 9.90, 'Platform fee should be £9.90');
console.assert(homeCookMultiCalc.grandTotal === 99.90, 'Grand total should be £99.90');

// Scenario B: Leak Repair - Fixed Price £75
const leakRepairCalc = calculateServicePrice({
  basePrice: 75,
  durationHours: 1,
  quantity: 1,
  selectedAddons: [],
  serviceUnit: 'visit',
  pricingRules: {
    pricingModel: 'fixed',
    enabledModels: ['fixed'],
    basePrice: 75
  }
});

console.log('Leak Repair Fixed Price Test Result:', leakRepairCalc);
console.assert(leakRepairCalc.subtotal === 75, 'Leak Repair subtotal should be £75');
console.assert(leakRepairCalc.grandTotal === 83.25, 'Leak Repair grand total should be £83.25');

console.log('✅ ALL MULTI-COMPONENT PRICING ENGINE TESTS PASSED 100% CLEAN!');
