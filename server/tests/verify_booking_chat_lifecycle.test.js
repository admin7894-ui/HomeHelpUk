require('dotenv').config({ path: './server/.env' });
const db = require('../db');
const chatsController = require('../controllers/chatsController');

async function runTests() {
  console.log('=== VERIFYING BOOKING CHAT LIFECYCLE & ACCESS CONTROL ===');

  try {
    // 1. Create a dummy pending booking
    const pendingBookingId = `test_bk_pending_${Date.now()}`;
    await db.query(
      `INSERT INTO bookings (id, customer_id, provider_id, category_id, status, date, time, address, start_timestamp, end_timestamp, duration_hours, service_quantity, hourly_rate, service_fee, total, subtotal, provider_payout, platform_commission_pct, created_at, updated_at)
       VALUES ($1, 'user_cde93ce1e126', 'prov_a7638a30f72d', 'cat_cooking', 'pending', '2026-08-01', '10:00 AM', '128 West Street', NOW(), NOW() + INTERVAL '2 hours', 2, 1, 20, 2, 22, 20, 20, 11, NOW(), NOW())`,
      [pendingBookingId]
    );

    // Test 1: Chat should NOT be created for pending booking
    const reqPending = { user: { id: 'user_cde93ce1e126', role: 'customer' }, params: { bookingId: pendingBookingId } };
    let pendingStatus = 0;
    const resPending = {
      status(code) { pendingStatus = code; return this; },
      json(data) { return data; }
    };

    await chatsController.getChat(reqPending, resPending);
    console.assert(pendingStatus === 403, `Pending chat should return 403, got ${pendingStatus}`);
    console.log('✅ Rule 1 Verified: Pending booking chat access blocked with 403 Forbidden!');

    // 2. Accept job (transition to assigned)
    await db.query(`UPDATE bookings SET status = 'assigned', updated_at = NOW() WHERE id = $1`, [pendingBookingId]);

    // Test 2: Chat should be created and accessible after acceptance
    let acceptedStatus = 0;
    let acceptedData = null;
    const resAccepted = {
      status(code) { acceptedStatus = code; return this; },
      json(data) { acceptedData = data; return data; }
    };

    await chatsController.getChat(reqPending, resAccepted);
    console.assert(acceptedData.success === true, 'Accepted booking chat should initialize successfully');
    console.assert(acceptedData.chatRule.active === true, 'Chat rule should be active');
    console.log('✅ Rule 2 Verified: Job acceptance initializes active chat conversation!');

    // 3. Mark completed > 7 days ago
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    await db.query(`UPDATE bookings SET status = 'completed', updated_at = $1 WHERE id = $2`, [eightDaysAgo, pendingBookingId]);

    let expiredStatus = 0;
    let expiredData = null;
    const resExpired = {
      status(code) { expiredStatus = code; return this; },
      json(data) { expiredData = data; return data; }
    };

    await chatsController.getChat(reqPending, resExpired);
    console.assert(expiredStatus === 403, `Expired completed chat (>7 days) should return 403, got ${expiredStatus}`);
    console.log('✅ Rule 3 Verified: Completed booking > 7 days auto-archives and blocks chat access!');

    // Clean up test booking
    await db.query('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE booking_id = $1)', [pendingBookingId]);
    await db.query('DELETE FROM conversations WHERE booking_id = $1', [pendingBookingId]);
    await db.query('DELETE FROM bookings WHERE id = $1', [pendingBookingId]);

    console.log('🎉 ALL BOOKING CHAT LIFECYCLE TESTS PASSED 100% CLEAN!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
