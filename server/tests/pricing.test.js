const fs = require('fs');
const path = require('path');
const bookingsController = require('../controllers/bookingsController');
const helpers = require('../utils/helpers');

// Helper to mock request and response
const mockReqRes = (body) => {
  const req = { body };
  const res = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.data = data;
      return this;
    },
  };
  return { req, res };
};

console.log('Testing Home Cook pricing logic (1 person vs 6 persons)...\n');

// 1. Create a 1-person booking (No additional quantity charge)
// Base 20 * 1 = 20. Platform fee 11% = 2.20. Customer total = 22.20. Payout = 20.00
const { req: req1, res: res1 } = mockReqRes({
  customerId: 'test_cust',
  providerId: 'prov_a7638a30f72d',
  categoryId: 'service_home_cook', // Home Cook (Basic Meal)
  date: '2026-10-10',
  time: '10:00 AM',
  address: '123 Test St',
  notes: '',
  durationHours: 1,
  serviceQuantity: 1,
  // NOT passing pricingBreakdown to force backend calculation
});

bookingsController.create(req1, res1);
const booking1 = res1.data.booking;

console.log('--- Booking 1: Home Cook (1 person) ---');
console.log(`Subtotal (Provider Payout): £${booking1.providerPayout.toFixed(2)}`);
console.log(`Platform Fee: £${booking1.serviceFee.toFixed(2)}`);
console.log(`Customer Total: £${booking1.total.toFixed(2)}`);
console.log(
  booking1.providerPayout === 20 && booking1.total === 22.2
    ? '✅ PASSED: 1-person pricing is correct.'
    : '❌ FAILED: 1-person pricing is incorrect.'
);
console.log('');

// 2. Create a 6-person booking
// Home Cook includes up to 4. 2 extra * £3 = £6 additional charge.
// Base 20 + 6 = 26. Platform fee 11% = 2.86. Customer total = 28.86. Payout = 26.00
const { req: req2, res: res2 } = mockReqRes({
  customerId: 'test_cust',
  providerId: 'prov_a7638a30f72d',
  categoryId: 'service_home_cook',
  date: '2026-10-10',
  time: '10:00 AM',
  address: '123 Test St',
  notes: '',
  durationHours: 1,
  serviceQuantity: 6,
});

bookingsController.create(req2, res2);
const booking2 = res2.data.booking;

console.log('--- Booking 2: Home Cook (6 persons) ---');
console.log(`Subtotal (Provider Payout): £${booking2.providerPayout.toFixed(2)}`);
console.log(`Platform Fee: £${booking2.serviceFee.toFixed(2)}`);
console.log(`Customer Total: £${booking2.total.toFixed(2)}`);
console.log(
  booking2.providerPayout === 26 && booking2.total === 28.86
    ? '✅ PASSED: 6-person pricing is correct (no duplicate fee).'
    : '❌ FAILED: 6-person pricing is incorrect.'
);
console.log('');

// Clean up test bookings from bookings.json
const bookingsPath = path.join(__dirname, '../data/bookings.json');
let bookings = JSON.parse(fs.readFileSync(bookingsPath, 'utf-8'));
bookings = bookings.filter(b => b.id !== booking1.id && b.id !== booking2.id);
fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2));

console.log('Test completed and mock data cleaned up.');
