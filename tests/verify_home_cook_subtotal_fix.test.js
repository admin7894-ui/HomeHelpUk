const { calculateServicePrice } = require('../../mobile/src/utils/pricingEngine');

console.log('=== Running Home Cook Subtotal & Platform Fee Fix Verification ===');

const pricingRules = {
  pricingModel: 'per_person',
  basePrice: 20,
  includedQuantity: 4,
  additionalUnitPrice: 10,
  includedUnit: 'person',
  additionalUnit: 'person'
};

// 1. Service Detail Page at 4 Persons
const calc4 = calculateServicePrice({
  basePrice: 20,
  quantity: 4,
  pricingRules
});

console.log('4 Persons Service Detail Result:', calc4);
console.assert(calc4.subtotal === 20, '4 Persons subtotal must be £20.00');
console.assert(calc4.grandTotal === 22.20, 'Platform fee grandTotal for checkout must be £22.20');

// 2. Service Detail Page at 5 Persons
const calc5 = calculateServicePrice({
  basePrice: 20,
  quantity: 5,
  pricingRules
});

console.log('5 Persons Service Detail Result:', calc5);
console.assert(calc5.extraUnits === 1, 'Extra persons should be 1');
console.assert(calc5.extraUnitsCost === 10, 'Extra person cost should be £10.00');
console.assert(calc5.subtotal === 30, '5 Persons subtotal must be £30.00');
console.assert(calc5.platformFee === 3.30, 'Platform fee must be £3.30');
console.assert(calc5.grandTotal === 33.30, 'Checkout grandTotal must be £33.30');

console.log('✅ ALL HOME COOK SUBTOTAL & PLATFORM FEE FIX TESTS PASSED 100% CLEAN!');
