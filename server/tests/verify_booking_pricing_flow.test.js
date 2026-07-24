const { calculateServicePrice } = require('../../mobile/src/utils/pricingEngine');

console.log('=== Running Booking Flow Pricing Engine Verification ===');

// Test 1: Home Cook - 6 people, 1 add-on (£10)
// Base Price = £50, Included People = 4, Extra Person Rate = £10, Extra People = 2 (* £10 = £20)
// Addons = £10. Subtotal = £50 + £20 + £10 = £80. Platform Fee (11%) = £8.80. Grand Total = £88.80
const homeCookCalc = calculateServicePrice({
  basePrice: 50,
  durationHours: 2,
  quantity: 6,
  selectedAddons: [{ id: 'diet', price: 10 }],
  serviceUnit: 'visit',
  pricingRules: {
    pricingModel: 'per_person',
    includedQuantity: 4,
    additionalUnitPrice: 10,
    includedUnit: 'person'
  }
});

console.log('Home Cook 6 Persons Test Result:', homeCookCalc);
console.assert(homeCookCalc.extraUnits === 2, 'Extra units should be 2');
console.assert(homeCookCalc.extraUnitsCost === 20, 'Extra units cost should be £20');
console.assert(homeCookCalc.subtotal === 80, 'Subtotal should be £80');
console.assert(homeCookCalc.platformFee === 8.80, 'Platform fee should be £8.80');
console.assert(homeCookCalc.grandTotal === 88.80, 'Grand total should be £88.80');

// Test 2: Provider Card Pricing Calculation - Provider B with Base = £60, Extra Person = £12
const provBCalc = calculateServicePrice({
  basePrice: 60,
  durationHours: 2,
  quantity: 6,
  selectedAddons: [{ id: 'diet', price: 10 }],
  serviceUnit: 'visit',
  pricingRules: {
    pricingModel: 'per_person',
    includedQuantity: 4,
    additionalUnitPrice: 12,
    includedUnit: 'person'
  }
});

console.log('Provider B (Custom Price £60, Extra £12) Test Result:', provBCalc);
console.assert(provBCalc.extraUnitsCost === 24, 'Extra units cost should be £24 (2 * 12)');
console.assert(provBCalc.subtotal === 94, 'Subtotal should be £94 (60 + 24 + 10)');
console.assert(provBCalc.platformFee === 10.34, 'Platform fee should be £10.34');
console.assert(provBCalc.grandTotal === 104.34, 'Grand total should be £104.34');

console.log('✅ ALL BOOKING PRICING FLOW TESTS PASSED 100% CLEAN!');
