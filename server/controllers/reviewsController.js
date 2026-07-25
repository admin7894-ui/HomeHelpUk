const db = require('../db');
const { generateId } = require('../utils/helpers');

exports.getByProvider = async (req, res) => {
  try {
    const revRes = await db.query(
      `SELECT id, booking_id as "bookingId", provider_id as "providerId", customer_id as "customerId",
              rating, comment, created_at as "createdAt"
       FROM reviews
       WHERE provider_id = $1
       ORDER BY created_at DESC`,
      [req.params.providerId]
    );

    const reviews = revRes.rows.map(r => ({
      ...r,
      rating: Number(r.rating),
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
    }));

    res.json({ success: true, reviews });
  } catch (err) {
    console.error('[Reviews getByProvider Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

exports.create = async (req, res) => {
  const { bookingId, providerId, rating, comment } = req.body;
  const customerId = req.user.id;

  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Only customers can leave reviews' });
  }

  if (!bookingId || !providerId || !rating) {
    return res.status(400).json({ success: false, message: 'bookingId, providerId, and rating are required' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (bRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bRes.rows[0];
    if (booking.customer_id !== customerId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
    }
    if (booking.status !== 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Booking must be completed to leave a review' });
    }
    if (booking.provider_id !== providerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Provider does not match booking' });
    }

    const existingRes = await client.query('SELECT id FROM reviews WHERE booking_id = $1 AND customer_id = $2', [bookingId, customerId]);
    if (existingRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
    }

    const reviewId = generateId('rev');
    const nowIso = new Date().toISOString();

    await client.query(
      `INSERT INTO reviews (id, booking_id, provider_id, customer_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [reviewId, bookingId, providerId, customerId, Number(rating), comment || '', nowIso]
    );

    // Recalculate provider aggregate rating
    const aggRes = await client.query(
      `SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as rev_count
       FROM reviews
       WHERE provider_id = $1`,
      [providerId]
    );

    const avgRating = aggRes.rows[0] ? Number(aggRes.rows[0].avg_rating) : 5.0;
    const revCount = aggRes.rows[0] ? Number(aggRes.rows[0].rev_count) : 0;

    await client.query(
      `UPDATE providers SET rating = $1, review_count = $2, updated_at = NOW() WHERE id = $3`,
      [avgRating, revCount, providerId]
    );

    await client.query('COMMIT');

    const reviewPayload = {
      id: reviewId,
      bookingId,
      providerId,
      customerId,
      rating: Number(rating),
      comment: comment || '',
      createdAt: nowIso
    };

    res.status(201).json({ success: true, review: reviewPayload });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Reviews create Error]', err);
    res.status(500).json({ success: false, message: 'Failed to create review' });
  } finally {
    client.release();
  }
};
