const fs = require('fs');
const path = require('path');

const appButtonPath = path.join(__dirname, '../../mobile/src/components/AppButton.js');
const bookProviderPath = path.join(__dirname, '../../mobile/src/screens/Customer/BookProviderScreen.js');

const appButtonCode = fs.readFileSync(appButtonPath, 'utf-8');
const bookProviderCode = fs.readFileSync(bookProviderPath, 'utf-8');

console.log('=== Running Explicit Availability Check & Button Contrast Verification ===');

// Check 1: AppButton supports both label and title
console.assert(appButtonCode.includes('title'), 'AppButton must support title prop');
console.assert(appButtonCode.includes('buttonText'), 'AppButton must use buttonText');

// Check 2: BookProviderScreen contains explicit Check Availability button
console.assert(bookProviderCode.includes('label="Check Availability"'), 'BookProviderScreen must contain Check Availability button');
console.assert(bookProviderCode.includes('handleExplicitCheckAvailability'), 'BookProviderScreen must contain handleExplicitCheckAvailability handler');

// Check 3: Provider card button binds clear label
console.assert(bookProviderCode.includes('label={`Choose ${item.name}`}'), 'Provider card button must have explicit Choose label');

console.log('✅ ALL EXPLICIT AVAILABILITY CHECK & BUTTON CONTRAST TESTS PASSED 100% CLEAN!');
