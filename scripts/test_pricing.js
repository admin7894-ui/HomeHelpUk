const fs = require('fs');
const path = require('path');

const PLATFORM_COMMISSION_PCT = 11;

const getIncludedQuantity = (baseIncludesStr) => {
  if (!baseIncludesStr) return 1;
  const match = baseIncludesStr.match(/(\d+)/g);
  if (match) {
    return parseInt(match[match.length - 1], 10);
  }
  return 1;
};

const runTest = (name, basePrice, unit, durationHours, baseIncludes, selectedQuantity, additionalCharge) => {
  const baseServiceRate = basePrice;
  const baseQuantity = (unit === 'hr') ? durationHours : 1;
  const baseServiceCost = baseServiceRate * baseQuantity;

  const includedQuantity = getIncludedQuantity(baseIncludes);
  const extraQuantity = Math.max(0, selectedQuantity - includedQuantity);
  const additionalQuantityCharge = extraQuantity * additionalCharge;

  const subtotal = baseServiceCost + additionalQuantityCharge;
  const serviceFee = Math.round(subtotal * (PLATFORM_COMMISSION_PCT / 100) * 100) / 100;
  const total = Math.round((subtotal + serviceFee) * 100) / 100;

  return {
    test: name,
    input: { durationHours, selectedQuantity },
    calculation: {
      baseServiceCost,
      includedQuantity,
      extraQuantity,
      additionalQuantityCharge,
      subtotal,
      total
    }
  };
};

const results = [
  runTest("Standard House Cleaning: 2 hours, 4 people (no extra)", 18, "hr", 2, "1-4 Persons", 4, 5),
  runTest("Standard House Cleaning: 2 hours, 6 people (charge 2 extra)", 18, "hr", 2, "1-4 Persons", 6, 5),
  runTest("Cooking: 6 people (charge extra)", 20, "hr", 1, "1-4 Persons", 6, 3),
  runTest("Party Cooking: 10 guests (within limit)", 150, "event", 1, "Up to 20 Guests", 10, 8),
  runTest("Party Cooking: 22 guests (charge 2 extra)", 150, "event", 1, "Up to 20 Guests", 22, 8),
  runTest("Dog Walking: 2 dogs (charge extra)", 15, "hr", 1, "1 Dog", 2, 5),
  runTest("Pet Sitting: 3 pets (charge extra)", 20, "hr", 1, "1 Pet", 3, 10),
  runTest("Oven Cleaning: 2 appliances (charge extra)", 45, "job", 1, "1 Appliance", 2, 15),
  runTest("Mobile Car Wash: 2 vehicles (charge extra)", 35, "job", 1, "1 Vehicle", 2, 20),
  runTest("Babysitting: 3 children (charge extra)", 20, "hr", 1, "1 Child", 3, 8),
];

console.log(JSON.stringify(results, null, 2));
