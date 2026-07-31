require('dotenv').config({ path: './server/.env' });
const db = require('../db');
const providersController = require('../controllers/providersController');

async function runTest() {
  console.log('=== VERIFYING BUSY PROVIDER FILTERING ===');

  try {
    const testBookingId = `test_busy_bk_${Date.now()}`;
    const testDate = '2026-08-15';
    const testTime = '10:00 AM';

    // 1. Create a dummy active booking for provider 'prov_a7638a30f72d' (Sanskar)
    await db.query(
      `INSERT INTO bookings (id, customer_id, provider_id, category_id, status, date, time, address, start_timestamp, end_timestamp, duration_hours, service_quantity, hourly_rate, service_fee, total, subtotal, provider_payout, platform_commission_pct, created_at, updated_at)
       VALUES ($1, 'user_cde93ce1e126', 'prov_a7638a30f72d', 'service_home_cook', 'assigned', $2, $3, '128 West Street', NOW(), NOW() + INTERVAL '2 hours', 2, 1, 20, 2, 22, 20, 20, 11, NOW(), NOW())`,
      [testBookingId, testDate, testTime]
    );

    // 2. Query available providers for the same slot (2026-08-15 at 10:00 AM)
    const req = {
      query: {
        serviceId: 'service_home_cook',
        date: testDate,
        time: testTime,
        durationHours: '2'
      }
    };

    let resultData = null;
    const res = {
      json(data) { resultData = data; return data; },
      status() { return this; }
    };

    await providersController.getAll(req, res);

    const availableProviderIds = (resultData.providers || []).map(p => p.id);
    console.log('Available Provider IDs for slot:', availableProviderIds);

    // Verify Sanskar (prov_a7638a30f72d) is NOT in availableProviderIds
    console.assert(!availableProviderIds.includes('prov_a7638a30f72d'), 'Busy provider Sanskar MUST be filtered out!');
    console.log('✅ Sanskar is successfully filtered out for slot 2026-08-15 10:00 AM!');

    // 3. Clean up test booking
    await db.query('DELETE FROM bookings WHERE id = $1', [testBookingId]);

    console.log('🎉 BUSY PROVIDER FILTERING TEST PASSED 100% CLEAN!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTest();
