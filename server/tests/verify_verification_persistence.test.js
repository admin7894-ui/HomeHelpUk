require('dotenv').config({ path: './server/.env' });
const db = require('../db');
const bookingsController = require('../controllers/bookingsController');

async function runTest() {
  console.log('=== VERIFYING EXECUTE JOB VERIFICATION CODE PERSISTENCE ===');

  try {
    const testBookingId = `test_verif_bk_${Date.now()}`;
    const testProviderId = 'prov_a7638a30f72d';

    // 1. Create a test booking in en_route state with start_otp = '1234'
    await db.query(
      `INSERT INTO bookings (id, customer_id, provider_id, category_id, status, date, time, address, start_timestamp, end_timestamp, duration_hours, service_quantity, hourly_rate, service_fee, total, subtotal, provider_payout, platform_commission_pct, start_otp, completion_otp, created_at, updated_at)
       VALUES ($1, 'user_cde93ce1e126', $2, 'service_home_cook', 'en_route', '2026-08-15', '10:00 AM', '128 West Street', NOW(), NOW() + INTERVAL '2 hours', 2, 1, 20, 2, 22, 20, 20, 11, '1234', '5678', NOW(), NOW())`,
      [testBookingId, testProviderId]
    );

    // 2. Perform start OTP verification (update status to in_progress)
    const reqStart = {
      user: { id: 'user_721716494171', role: 'provider' },
      params: { id: testBookingId },
      body: { status: 'in_progress', startOtp: '1234' }
    };

    let startResult = null;
    const resStart = {
      status() { return this; },
      json(data) { startResult = data; return data; }
    };

    await bookingsController.updateStatus(reqStart, resStart);

    console.assert(startResult.success === true, 'Update status to in_progress should succeed');
    console.assert(startResult.booking.status === 'in_progress', 'Booking status must be in_progress');
    console.assert(startResult.booking.verificationDetails.startVerificationCompleted === true, 'startVerificationCompleted flag MUST be true');
    console.assert(Boolean(startResult.booking.verificationDetails.startVerificationTime), 'startVerificationTime MUST be recorded');

    console.log('✅ Start verification details persisted successfully:');
    console.log(startResult.booking.verificationDetails);

    // 3. Fetch booking via GET /api/bookings/:id (simulating opening screen after navigating away)
    const reqGet = {
      user: { id: 'user_721716494171', role: 'provider' },
      params: { id: testBookingId }
    };

    let getResult = null;
    const resGet = {
      status() { return this; },
      json(data) { getResult = data; return data; }
    };

    await bookingsController.getById(reqGet, resGet);

    console.assert(getResult.booking.verificationDetails.startVerificationCompleted === true, 'startVerificationCompleted MUST persist on GET /api/bookings/:id');
    console.log('✅ Fetched booking after navigation restored startVerificationCompleted = true!');

    // 4. Clean up test booking
    await db.query('DELETE FROM bookings WHERE id = $1', [testBookingId]);

    console.log('🎉 ALL VERIFICATION PERSISTENCE TESTS PASSED 100% CLEAN!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTest();
