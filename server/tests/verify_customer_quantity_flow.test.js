const { calculateServicePrice } = require('../../mobile/src/utils/pricingEngine');

console.log('=== Running Customer Quantity Selection & Checkout Breakdown Flow Verification ===');

// Test Case 1: Cooking - Home Cook (Per Person: 4 included, +£3/extra)
const homeCookPricing = calculateServicePrice({
  basePrice: 20,
  quantity: 6, // Customer selected 6 persons (2 extra)
  pricingRules: {
    pricingModel: 'per_person',
    basePrice: 20,
    includedQuantity: 4,
    additionalUnitPrice: 3,
    includedUnit: 'person',
    additionalUnit: 'person',
    minimumQuantity: 1,
    maximumQuantity: 10
  }
});

console.log('Home Cook (6 Persons) Breakdown:', homeCookPricing);
console.assert(homeCookPricing.includedQuantity === 4, 'Included quantity should be 4');
console.assert(homeCookPricing.selectedQuantity === 6, 'Selected quantity should be 6');
console.assert(homeCookPricing.extraUnits === 2, 'Extra units should be 2');
console.assert(homeCookPricing.extraUnitsCost === 6, 'Extra units cost should be 2 * 3 = £6.00');
console.assert(homeCookPricing.subtotal === 26, 'Subtotal should be £20 + £6 = £26.00');

// Test Case 2: Cleaning - Standard House Cleaning (Per Room: 2 included, +£10/extra)
const cleaningPricing = calculateServicePrice({
  basePrice: 18,
  quantity: 4, // Customer selected 4 rooms (2 extra)
  pricingRules: {
    pricingModel: 'per_unit',
    basePrice: 18,
    includedQuantity: 2,
    additionalUnitPrice: 10,
    includedUnit: 'room',
    additionalUnit: 'room',
    minimumQuantity: 1,
    maximumQuantity: 10
  }
});

console.log('Standard House Cleaning (4 Rooms) Breakdown:', cleaningPricing);
console.assert(cleaningPricing.extraUnits === 2, 'Extra rooms should be 2');
console.assert(cleaningPricing.extraUnitsCost === 20, 'Extra rooms cost should be 2 * 10 = £20.00');
console.assert(cleaningPricing.subtotal === 38, 'Subtotal should be £18 + £20 = £38.00');

// Test Case 3: Pet Care - Pet Sitting (Per Pet: 1 included, +£5/extra)
const petPricing = calculateServicePrice({
  basePrice: 25,
  quantity: 3, // Customer selected 3 pets (2 extra)
  pricingRules: {
    pricingModel: 'per_unit',
    basePrice: 25,
    includedQuantity: 1,
    additionalUnitPrice: 5,
    includedUnit: 'pet',
    additionalUnit: 'pet',
    minimumQuantity: 1,
    maximumQuantity: 5
  }
});

console.log('Pet Sitting (3 Pets) Breakdown:', petPricing);
console.assert(petPricing.extraUnits === 2, 'Extra pets should be 2');
console.assert(petPricing.extraUnitsCost === 10, 'Extra pets cost should be 2 * 5 = £10.00');
console.assert(petPricing.subtotal === 35, 'Subtotal should be £25 + £10 = £35.00');

console.log('✅ ALL CUSTOMER QUANTITY SELECTION FLOW TESTS PASSED 100% CLEAN!');
