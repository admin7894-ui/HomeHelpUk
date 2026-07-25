const db = require('../db');
const { generateId, parseTime, hasTimeOverlap } = require('../utils/helpers');

const PLATFORM_COMMISSION_PCT = 11;
const STATUS_FLOW = ['pending', 'assigned', 'en_route', 'in_progress', 'completed'];

function sanitizeBookingForResponse(req, booking) {
  const sanitized = { ...booking };
  if (req.user && req.user.role === 'provider') {
    delete sanitized.startOtp;
    delete sanitized.completionOtp;
  }
  return sanitized;
}

function formatBookingRow(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    providerId: row.provider_id || 'open',
    categoryId: row.category_id,
    status: row.status,
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : row.date,
    time: row.time,
    address: row.address,
    notes: row.notes || '',
    durationHours: Number(row.duration_hours),
    serviceQuantity: Number(row.service_quantity) || 1,
    hourlyRate: Number(row.hourly_rate),
    serviceFee: Number(row.service_fee),
    total: Number(row.total),
    subtotal: Number(row.subtotal),
    providerPayout: Number(row.provider_payout),
    pricingBreakdown: row.pricing_breakdown || null,
    pricingSnapshot: row.pricing_snapshot || null,
    platformCommissionPct: Number(row.platform_commission_pct),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    startOtp: row.start_otp,
    completionOtp: row.completion_otp,
    photos: row.photos || {},
    declineRecords: row.decline_records || []
  };
}

exports.getAll = async (req, res) => {
  try {
    const { status, category } = req.query;
    let queryText = `
      SELECT b.*, u.name as customer_name
      FROM bookings b
      LEFT JOIN users u ON b.customer_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];

    if (req.user && req.user.role === 'customer') {
      queryParams.push(req.user.id);
      queryText += ` AND b.customer_id = $${queryParams.length}`;
    } else if (req.user && req.user.role === 'provider') {
      const pRes = await db.query('SELECT p.id, p.user_id FROM providers p WHERE p.user_id = $1', [req.user.id]);
      const pId = pRes.rows[0] ? pRes.rows[0].id : null;

      if (!pId) {
        return res.json({ success: true, bookings: [] });
      }

      // Fetch active provider categories
      const catRes = await db.query('SELECT category_id FROM provider_categories WHERE provider_id = $1', [pId]);
      const activeCategories = catRes.rows.map(r => r.category_id);

      queryParams.push(pId);
      const pIdx = queryParams.length;

      queryParams.push(activeCategories);
      const catIdx = queryParams.length;

      queryText += ` AND (
        b.provider_id = $${pIdx} OR 
        ((b.provider_id IS NULL OR b.provider_id = 'open') AND (b.category_id = ANY($${catIdx}) OR EXISTS (
          SELECT 1 FROM services s WHERE s.id = b.category_id AND s.category_id = ANY($${catIdx})
        )))
      )`;
    }

    if (status) {
      queryParams.push(status);
      queryText += ` AND b.status = $${queryParams.length}`;
    }

    queryText += ` ORDER BY b.created_at DESC`;

    const resBookings = await db.query(queryText, queryParams);
    let bookings = resBookings.rows.map(row => {
      const formatted = formatBookingRow(row);
      formatted.customerName = row.customer_name || 'Customer';
      return formatted;
    });

    if (req.user && req.user.role === 'provider') {
      const pRes = await db.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
      const pId = pRes.rows[0] ? pRes.rows[0].id : null;
      if (pId) {
        bookings = bookings.filter(b => {
          const hasDeclined = b.declineRecords && b.declineRecords.some(d => d.providerId === pId);
          return !hasDeclined;
        });
      }
    }

    res.json({
      success: true,
      bookings: bookings.map(b => sanitizeBookingForResponse(req, b))
    });
  } catch (err) {
    console.error('[Bookings getAll Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
};

exports.getById = async (req, res) => {
  try {
    const bookingRes = await db.query(
      `SELECT b.*, u.name as customer_name
       FROM bookings b
       LEFT JOIN users u ON b.customer_id = u.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (bookingRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });

    const row = bookingRes.rows[0];
    const booking = formatBookingRow(row);
    booking.customerName = row.customer_name || 'Customer';

    if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
    }
    if (req.user.role === 'provider') {
      const pRes = await db.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
      const pId = pRes.rows[0] ? pRes.rows[0].id : null;
      if (booking.providerId !== 'open' && booking.providerId !== pId) {
        return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
      }
    }

    res.json({ success: true, booking: sanitizeBookingForResponse(req, booking) });
  } catch (err) {
    console.error('[Bookings getById Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking detail' });
  }
};

exports.create = async (req, res) => {
  const { customerId, providerId, categoryId, date, time, address, notes, durationHours, serviceQuantity, pricingBreakdown } = req.body;

  if (!customerId || !providerId || !categoryId || !date || !time || !address || !durationHours) {
    return res.status(400).json({ success: false, message: 'Missing required booking fields' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Calculate timestamps
    const startTimeMs = parseTime(date, time) || new Date(`${date}T${time}:00`).getTime();
    const startTimestamp = new Date(startTimeMs).toISOString();
    const endTimestamp = new Date(startTimeMs + (Number(durationHours) * 60 * 60 * 1000)).toISOString();

    const targetProviderId = (providerId !== 'open' && providerId) ? providerId : null;

    // --- CONFLICT & RACE CONDITION CHECK ---
    if (targetProviderId) {
      const activeStatuses = ['pending', 'assigned', 'en_route', 'in_progress', 'confirmed', 'accepted'];
      const conflictRes = await client.query(
        `SELECT id, date, time, duration_hours as "durationHours"
         FROM bookings
         WHERE provider_id = $1
           AND status = ANY($2)
           AND (start_timestamp < $4 AND end_timestamp > $3)
         FOR UPDATE`,
        [targetProviderId, activeStatuses, startTimestamp, endTimestamp]
      );

      if (conflictRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'This provider is already booked at this time. Please select another time or provider.'
        });
      }
    }

    // Rates & Calculation
    let baseServiceRate = 20;
    const srvRes = await client.query('SELECT price FROM services WHERE id = $1', [categoryId]);
    if (srvRes.rows.length > 0) {
      baseServiceRate = Number(srvRes.rows[0].price);
    }

    if (targetProviderId) {
      const psRes = await client.query('SELECT custom_price FROM provider_services WHERE provider_id = $1 AND service_id = $2', [targetProviderId, categoryId]);
      if (psRes.rows.length > 0 && psRes.rows[0].custom_price !== null) {
        baseServiceRate = Number(psRes.rows[0].custom_price);
      }
    }

    const subtotal = pricingBreakdown ? pricingBreakdown.subtotal : (baseServiceRate * Number(durationHours));
    const serviceFee = pricingBreakdown ? pricingBreakdown.platformFee : (Math.round(subtotal * (PLATFORM_COMMISSION_PCT / 100) * 100) / 100);
    const total = pricingBreakdown ? pricingBreakdown.total : (Math.round((subtotal + serviceFee) * 100) / 100);

    const bookingId = generateId('booking');
    const startOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const completionOtp = Math.floor(1000 + Math.random() * 9000).toString();

    await client.query(
      `INSERT INTO bookings (
         id, customer_id, provider_id, category_id, status, date, time,
         start_timestamp, end_timestamp, address, notes, duration_hours, service_quantity,
         hourly_rate, subtotal, service_fee, total, provider_payout, platform_commission_pct,
         start_otp, completion_otp, photos, pricing_breakdown, pricing_snapshot, created_at
       )
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW())`,
      [
        bookingId,
        customerId,
        targetProviderId,
        categoryId,
        date,
        time,
        startTimestamp,
        endTimestamp,
        address,
        notes || '',
        Number(durationHours),
        Number(serviceQuantity) || 1,
        baseServiceRate,
        subtotal,
        serviceFee,
        total,
        subtotal,
        PLATFORM_COMMISSION_PCT,
        startOtp,
        completionOtp,
        JSON.stringify({}),
        JSON.stringify(pricingBreakdown || null),
        JSON.stringify(req.body.pricingSnapshot || null)
      ]
    );

    // Send notification to provider if assigned
    if (targetProviderId) {
      const pUserRes = await client.query('SELECT user_id FROM providers WHERE id = $1', [targetProviderId]);
      if (pUserRes.rows.length > 0) {
        const notifId = generateId('notif');
        await client.query(
          `INSERT INTO notifications (id, user_id, title, message, read, created_at)
           VALUES ($1, $2, 'New Job Available', $3, false, NOW())`,
          [notifId, pUserRes.rows[0].user_id, `A new service job is available near you.`]
        );
      }
    }

    await client.query('COMMIT');

    const createdRes = await db.query('SELECT b.*, u.name as customer_name FROM bookings b JOIN users u ON b.customer_id = u.id WHERE b.id = $1', [bookingId]);
    const formatted = formatBookingRow(createdRes.rows[0]);
    formatted.customerName = createdRes.rows[0].customer_name;

    res.status(201).json({ success: true, booking: sanitizeBookingForResponse(req, formatted) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Bookings create Error]', err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  } finally {
    client.release();
  }
};

exports.updateStatus = async (req, res) => {
  const { status, startOtp, completionOtp, photos } = req.body;

  if (!STATUS_FLOW.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${STATUS_FLOW.join(', ')}` });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (bRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bRes.rows[0];

    // Auth verification
    const pRes = await client.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const pId = pRes.rows[0] ? pRes.rows[0].id : null;

    if (booking.provider_id && booking.provider_id !== 'open' && req.user.role === 'provider' && booking.provider_id !== pId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
    }
    if (req.user.role === 'customer' && booking.customer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
    }

    let updatedProviderId = booking.provider_id;

    if (status === 'assigned' && req.user.role === 'provider') {
      if (booking.provider_id && booking.provider_id !== 'open' && booking.provider_id !== pId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Booking is already assigned to another provider' });
      }
      if (!pId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Provider profile not completed' });
      }
      updatedProviderId = pId;
    }

    if (status === 'in_progress') {
      if (!startOtp) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Start OTP is required to start the job' });
      }
      if (booking.start_otp && booking.start_otp !== startOtp) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Invalid start OTP code' });
      }
    }

    if (status === 'completed') {
      if (booking.status === 'completed') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Booking is already marked as completed' });
      }
      if (!completionOtp) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Completion OTP is required to finish the job' });
      }
      if (booking.completion_otp && booking.completion_otp !== completionOtp) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Invalid completion OTP code' });
      }

      // Wallet Release Payment with Transaction Safety & Idempotency
      const providerForWallet = updatedProviderId;
      if (providerForWallet) {
        let wRes = await client.query('SELECT * FROM wallets WHERE provider_id = $1 FOR UPDATE', [providerForWallet]);
        let wallet = wRes.rows[0];
        if (!wallet) {
          const wId = generateId('wallet');
          await client.query(
            'INSERT INTO wallets (id, provider_id, balance, pending_payouts) VALUES ($1, $2, 0.00, 0.00)',
            [wId, providerForWallet]
          );
          wRes = await client.query('SELECT * FROM wallets WHERE provider_id = $1 FOR UPDATE', [providerForWallet]);
          wallet = wRes.rows[0];
        }

        // Check if already credited
        const txCheck = await client.query(
          `SELECT id FROM wallet_transactions WHERE wallet_id = $1 AND booking_id = $2 AND type = 'credit'`,
          [wallet.id, booking.id]
        );

        if (txCheck.rows.length === 0) {
          const payout = Number(booking.provider_payout) || Number(booking.subtotal) || (Number(booking.hourly_rate) * Number(booking.duration_hours));
          await client.query(
            `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
            [payout, wallet.id]
          );

          const txId = generateId('tx');
          await client.query(
            `INSERT INTO wallet_transactions (id, wallet_id, booking_id, type, amount, status, description, timestamp)
             VALUES ($1, $2, $3, 'credit', $4, 'completed', 'Earnings for job completion', NOW())`,
            [txId, wallet.id, booking.id, payout]
          );
        }
      }
    }

    const mergedPhotos = photos ? { ...booking.photos, ...photos } : booking.photos;

    await client.query(
      `UPDATE bookings
       SET status = $1, provider_id = $2, photos = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, updatedProviderId, JSON.stringify(mergedPhotos), booking.id]
    );

    // Send Customer Notification
    const statusMessages = {
      assigned: 'A provider has been assigned to your booking.',
      en_route: 'Your provider is on the way.',
      in_progress: 'Your provider has started the job.',
      completed: 'Your booking is complete. Please leave a review!',
    };

    if (statusMessages[status]) {
      const notifId = generateId('notif');
      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, read, created_at)
         VALUES ($1, $2, 'Booking Update', $3, false, NOW())`,
        [notifId, booking.customer_id, statusMessages[status]]
      );
    }

    await client.query('COMMIT');

    const updatedRes = await db.query(
      `SELECT b.*, u.name as customer_name FROM bookings b JOIN users u ON b.customer_id = u.id WHERE b.id = $1`,
      [booking.id]
    );
    const formatted = formatBookingRow(updatedRes.rows[0]);
    formatted.customerName = updatedRes.rows[0].customer_name;

    res.json({ success: true, booking: sanitizeBookingForResponse(req, formatted) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Bookings updateStatus Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update booking status' });
  } finally {
    client.release();
  }
};

exports.decline = async (req, res) => {
  try {
    const { reason, customReason } = req.body;
    if (req.user.role !== 'provider') {
      return res.status(403).json({ success: false, message: 'Only providers can decline jobs' });
    }

    const pRes = await db.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const pId = pRes.rows[0] ? pRes.rows[0].id : null;
    if (!pId) return res.status(403).json({ success: false, message: 'Access denied' });

    const bRes = await db.query('SELECT decline_records FROM bookings WHERE id = $1', [req.params.id]);
    if (bRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });

    let declineRecords = bRes.rows[0].decline_records || [];
    if (!Array.isArray(declineRecords)) declineRecords = [];

    const alreadyDeclined = declineRecords.some(d => d.providerId === pId);
    if (!alreadyDeclined) {
      declineRecords.push({
        providerId: pId,
        reason: reason || 'Not specified',
        customReason: customReason || null,
        declinedAt: new Date().toISOString()
      });

      await db.query('UPDATE bookings SET decline_records = $1 WHERE id = $2', [JSON.stringify(declineRecords), req.params.id]);
    }

    res.json({ success: true, message: 'Job declined successfully' });
  } catch (err) {
    console.error('[Bookings decline Error]', err);
    res.status(500).json({ success: false, message: 'Failed to decline booking' });
  }
};

exports.getDeclined = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'provider') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pRes = await db.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const pId = pRes.rows[0] ? pRes.rows[0].id : null;
    if (!pId) return res.status(403).json({ success: false, message: 'Access denied' });

    const bRes = await db.query(
      `SELECT b.*, u.name as customer_name
       FROM bookings b
       LEFT JOIN users u ON b.customer_id = u.id
       WHERE b.decline_records @> jsonb_build_array(jsonb_build_object('providerId', $1::text))`
    );

    const bookings = bRes.rows.map(row => {
      const formatted = formatBookingRow(row);
      formatted.customerName = row.customer_name || 'Customer';
      return sanitizeBookingForResponse(req, formatted);
    });

    res.json({ success: true, bookings });
  } catch (err) {
    console.error('[Bookings getDeclined Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch declined bookings' });
  }
};

exports.getStatusFlow = (req, res) => {
  res.json({ success: true, statusFlow: STATUS_FLOW });
};
