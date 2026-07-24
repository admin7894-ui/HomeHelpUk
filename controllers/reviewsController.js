const fs = require('fs');
const path = require('path');
const { generateId } = require('../utils/helpers');

const reviewsPath = path.join(__dirname, '../data/reviews.json');
const providersPath = path.join(__dirname, '../data/providers.json');
const bookingsPath = path.join(__dirname, '../data/bookings.json');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));

exports.getByProvider = (req, res) => {
  const reviews = readJson(reviewsPath).filter((r) => r.providerId === req.params.providerId);
  res.json({ success: true, reviews });
};

exports.create = (req, res) => {
  const { bookingId, providerId, rating, comment } = req.body;
  const customerId = req.user.id;

  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Only customers can leave reviews' });
  }

  if (!bookingId || !providerId || !rating) {
    return res.status(400).json({ success: false, message: 'bookingId, providerId, and rating are required' });
  }

  const bookings = readJson(bookingsPath);
  const booking = bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }
  if (booking.customerId !== customerId) {
    return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
  }
  if (booking.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Booking must be completed to leave a review' });
  }
  if (booking.providerId !== providerId) {
    return res.status(400).json({ success: false, message: 'Provider does not match booking' });
  }

  const reviews = readJson(reviewsPath);
  const existingReview = reviews.find((r) => r.bookingId === bookingId && r.customerId === customerId);
  if (existingReview) {
    return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
  }

  const review = {
    id: generateId('rev'),
    bookingId,
    providerId,
    customerId,
    rating: Number(rating),
    comment: comment || '',
    createdAt: new Date().toISOString(),
  };

  reviews.push(review);
  writeJson(reviewsPath, reviews);

  // Recalculate provider's aggregate rating for the demo
  const providers = readJson(providersPath);
  const providerIndex = providers.findIndex((p) => p.id === providerId);
  if (providerIndex !== -1) {
    const providerReviews = reviews.filter((r) => r.providerId === providerId);
    const avg = providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length;
    providers[providerIndex].rating = Math.round(avg * 10) / 10;
    providers[providerIndex].reviewCount = providerReviews.length;
    writeJson(providersPath, providers);
  }

  res.status(201).json({ success: true, review });
};
