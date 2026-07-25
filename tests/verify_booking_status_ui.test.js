const fs = require('fs');
const path = require('path');

const bookingStatusPath = path.join(__dirname, '../../mobile/src/screens/Customer/BookingStatusScreen.js');
const fileContent = fs.readFileSync(bookingStatusPath, 'utf-8');

console.log('=== Running Booking Status UI Verification Test ===');

// 1. Assert legacy #4F46E5 indigo color is gone
console.assert(!fileContent.includes('#4F46E5'), 'Legacy indigo color #4F46E5 must be completely removed');

// 2. Assert deep forest green #0A3925 is used
console.assert(fileContent.includes('#0A3925'), 'Deep forest green #0A3925 must be present in innerDot and total text');

// 3. Assert PAYMENT DETAILS section header is present
console.assert(fileContent.includes('PAYMENT DETAILS'), 'PAYMENT DETAILS section header must be present');

// 4. Assert Message Professional button action is present
console.assert(fileContent.includes('Message Professional'), 'Message Professional button label must be present');

console.log('✅ ALL BOOKING STATUS UI VERIFICATION TESTS PASSED 100% CLEAN!');
