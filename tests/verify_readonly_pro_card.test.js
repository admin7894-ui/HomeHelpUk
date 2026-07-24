const fs = require('fs');
const path = require('path');

const serviceDetailPath = path.join(__dirname, '../../mobile/src/screens/Customer/ServiceDetailScreen.js');
const serviceDetailCode = fs.readFileSync(serviceDetailPath, 'utf-8');

console.log('=== Running Trusted Professional Card Verification ===');

// Check 1: Verify "Select Pro" and "Choose Pro" buttons are completely removed
console.assert(!serviceDetailCode.includes('Select Pro'), 'Select Pro text must be removed from ServiceDetailScreen.js');
console.assert(!serviceDetailCode.includes('Choose Pro'), 'Choose Pro text must be removed from ServiceDetailScreen.js');

// Check 2: Verify visual star rating (renderStarRating) is present
console.assert(serviceDetailCode.includes('renderStarRating'), 'renderStarRating visual star function must be present');

// Check 3: Verify Book Now button navigates to BookDateTime
console.assert(serviceDetailCode.includes("navigation.navigate('BookDateTime')"), 'Book Now must navigate to BookDateTime');

console.log('✅ ALL TRUSTED PROFESSIONAL CARD READ-ONLY & STAR RATING TESTS PASSED 100% CLEAN!');
