const fs = require('fs');
const path = require('path');
const { generateId, findCategoryOrService, hasTimeOverlap } = require('../utils/helpers');

const bookingsPath = path.join(__dirname, '../data/bookings.json');
const categoriesPath = path.join(__dirname, '../data/categories.json');
const notificationsPath = path.join(__dirname, '../data/notifications.json');
const providersPath = path.join(__dirname, '../data/providers.json');
const usersPath = path.join(__dirname, '../data/users.json');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));

const PLATFORM_COMMISSION_PCT = 11; // demo constant — "fairer" positioning vs 15-25% industry norm

// Ordered lifecycle used for the mock live-status tracker
const STATUS_FLOW = ['pending', 'assigned', 'en_route', 'in_progress', 'completed'];

function sanitizeBookingForResponse(req, booking) {
  const sanitized = { ...booking };
  if (req.user && req.user.role === 'provider') {
    delete sanitized.startOtp;
    delete sanitized.completionOtp;
  }
  return sanitized;
}

exports.getAll = (req, res) => {
  const bookings = readJson(bookingsPath);
  const categories = readJson(categoriesPath);
  const { status, category } = req.query;

  const getParentCatId = (serviceId) => {
    if (serviceId && serviceId.startsWith('cat_')) return serviceId;
    const c = categories.find(cat => cat.subcategories?.some(sub => sub.services?.some(s => s.id === serviceId)));
    return c ? c.id : null;
  };

  let result = [];
  if (req.user && req.user.role === 'customer') {
    result = bookings.filter((b) => b.customerId === req.user.id);
  } else if (req.user && req.user.role === 'provider') {
    const users = readJson(usersPath);
    const currentUser = users.find((u) => u.id === req.user.id);
    const pId = currentUser ? currentUser.providerId : null;

    if (pId) {
      const providers = readJson(providersPath);
      const provider = providers.find((p) => p.id === pId);
      const activeCategories = provider ? provider.categories : [];

      result = bookings.filter((b) => {
        const hasDeclined = b.declineRecords && b.declineRecords.some(d => d.providerId === pId);
        if (hasDeclined) return false;
        
        return b.providerId === pId || 
               (b.providerId === 'open' && activeCategories.includes(getParentCatId(b.categoryId)));
      });
    }
  }

  if (status) {
    result = result.filter((b) => b.status === status);
  }

  if (category) {
    result = result.filter((b) => getParentCatId(b.categoryId) === category);
  }

  result = [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const users = readJson(usersPath);
  res.json({ success: true, bookings: result.map((b) => {
    const customer = users.find(u => u.id === b.customerId);
    const sanitized = sanitizeBookingForResponse(req, b);
    sanitized.customerName = customer ? customer.name : 'Customer';
    return sanitized;
  }) });
};

exports.getById = (req, res) => {
  const bookings = readJson(bookingsPath);
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

  // Security Check: Is the logged-in user authorized to view this booking?
  if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
  }
  if (req.user.role === 'provider') {
    const users = readJson(usersPath);
    const currentUser = users.find((u) => u.id === req.user.id);
    const pId = currentUser ? currentUser.providerId : null;
    if (booking.providerId !== pId) {
      return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
    }
  }

  res.json({ success: true, booking: sanitizeBookingForResponse(req, booking) });
};

exports.create = (req, res) => {
  const { customerId, providerId, categoryId, date, time, address, notes, durationHours, serviceQuantity, pricingBreakdown } = req.body;

  if (!customerId || !providerId || !categoryId || !date || !time || !address || !durationHours) {
    return res.status(400).json({ success: false, message: 'Missing required booking fields' });
  }

  const categories = readJson(categoriesPath);
  const providers = readJson(providersPath);
  const category = findCategoryOrService(categories, categoryId);
  let provider = null;
  if (providerId !== 'open') {
    provider = providers.find((p) => p.id === providerId);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
  }

  const getIncludedQuantity = (baseIncludesStr) => {
    if (!baseIncludesStr) return 1;
    const match = baseIncludesStr.match(/(\d+)/g);
    if (match) {
      return parseInt(match[match.length - 1], 10);
    }
    return 1;
  };

  const providerService = provider && provider.services ? provider.services.find(s => s.serviceId === categoryId) : null;
  const baseServiceRate = (providerService && providerService.customPrice) || (provider && provider.hourlyRate) || (category && category.price) || 20;
  const baseQuantity = (category && category.unit === 'hr') ? Number(durationHours) : 1;
  const baseServiceCost = baseServiceRate * baseQuantity;

  const includedQuantity = getIncludedQuantity(category && category.baseIncludes);
  const selectedQuantity = Number(serviceQuantity) || 1;
  const extraQuantity = Math.max(0, selectedQuantity - includedQuantity);
  const additionalChargeRate = (category && category.additionalCharge) || 0;
  const additionalQuantityCharge = extraQuantity * additionalChargeRate;

  const subtotal = baseServiceCost + additionalQuantityCharge;
  const computedServiceFee = Math.round(subtotal * (PLATFORM_COMMISSION_PCT / 100) * 100) / 100;
  const computedTotal = Math.round((subtotal + computedServiceFee) * 100) / 100;

  const bookings = readJson(bookingsPath);

  // --- CONFLICT CHECK ---
  if (providerId !== 'open') {
    const activeStatuses = ['pending', 'assigned', 'en_route', 'in_progress', 'confirmed', 'accepted'];
    const providerActiveBookings = bookings.filter(b => 
      b.providerId === providerId && 
      activeStatuses.includes(b.status)
    );

    const newBookingTimeSlot = { date, time, durationHours };
    
    for (const active of providerActiveBookings) {
      if (hasTimeOverlap(newBookingTimeSlot, active)) {
        return res.status(409).json({
          success: false,
          message: 'This provider is already booked at this time. Please select another time or provider.'
        });
      }
    }
  }

  const serviceFee = pricingBreakdown ? pricingBreakdown.platformFee : computedServiceFee;
  const total = pricingBreakdown ? pricingBreakdown.total : computedTotal;
  const finalSubtotal = pricingBreakdown ? pricingBreakdown.subtotal : subtotal;

  const booking = {
    id: generateId('booking'),
    customerId,
    providerId,
    categoryId,
    status: 'pending',
    date,
    time,
    address,
    notes: notes || '',
    durationHours: Number(durationHours),
    serviceQuantity: Number(serviceQuantity) || 1,
    hourlyRate: baseServiceRate,
    serviceFee,
    total,
    subtotal: finalSubtotal,
    providerPayout: finalSubtotal,
    pricingBreakdown: pricingBreakdown || null,
    pricingSnapshot: req.body.pricingSnapshot || {
      pricingModel: (category && category.pricingRules && category.pricingRules.pricingModel) || 'fixed',
      basePrice: baseServiceRate,
      includedQuantity,
      selectedQuantity,
      additionalQuantity: extraQuantity,
      additionalUnitPrice: additionalChargeRate,
      additionalCharges: additionalQuantityCharge,
      addonsTotal: pricingBreakdown ? pricingBreakdown.addonsTotal || 0 : 0,
      finalPrice: total
    },
    platformCommissionPct: PLATFORM_COMMISSION_PCT,
    createdAt: new Date().toISOString(),
    startOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    completionOtp: Math.floor(1000 + Math.random() * 9000).toString(),
  };

  bookings.push(booking);
  writeJson(bookingsPath, bookings);

  // Notify the provider of a new job — mirrors the "live sync" demo moment
  const notifications = readJson(notificationsPath);
  const users = readJson(usersPath);
  const providerUser = users.find((u) => u.providerId === providerId);
  if (providerUser) {
    notifications.push({
      id: generateId('notif'),
      userId: providerUser.id,
      title: 'New Job Available',
      message: `A new ${category.name} job is available near you.`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    writeJson(notificationsPath, notifications);
  }

  res.status(201).json({ success: true, booking: sanitizeBookingForResponse(req, booking) });
};

exports.updateStatus = (req, res) => {
  const { status, startOtp, completionOtp, photos } = req.body;
  const bookings = readJson(bookingsPath);
  const index = bookings.findIndex((b) => b.id === req.params.id);

  if (index === -1) return res.status(404).json({ success: false, message: 'Booking not found' });
  if (!STATUS_FLOW.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${STATUS_FLOW.join(', ')}` });
  }

  const booking = bookings[index];

  // Security Check: Verify authorization for status transitions
  const users = readJson(usersPath);
  const currentUser = users.find((u) => u.id === req.user.id);
  const pId = currentUser ? currentUser.providerId : null;

  if (booking.providerId && booking.providerId !== 'open' && req.user.role === 'provider' && booking.providerId !== pId) {
    return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
  }
  if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied: not your booking' });
  }

  // If status is transitioning to 'assigned', associate the booking with the logged-in provider
  if (status === 'assigned' && req.user && req.user.role === 'provider') {
    if (booking.providerId !== 'open' && booking.providerId !== pId) {
      return res.status(400).json({ success: false, message: 'Booking is already assigned to another provider' });
    }

    const providers = readJson(providersPath);
    const provider = providers.find((p) => p.id === pId);
    
    if (!provider) {
      return res.status(400).json({ success: false, message: 'Provider profile not completed' });
    }

    const hasCategory = provider.categories && provider.categories.includes(booking.categoryId);
    const hasService = provider.services && provider.services.some(s => s.serviceId === booking.categoryId);

    if (!hasCategory && !hasService) {
      return res.status(403).json({ success: false, message: 'Provider does not offer this service category' });
    }

    booking.providerId = provider.id;
  }

  // If status is transitioning to 'in_progress', verify startOtp if provided
  if (status === 'in_progress') {
    if (!startOtp) {
      return res.status(400).json({ success: false, message: 'Start OTP is required to start the job' });
    }
    if (booking.startOtp && booking.startOtp !== startOtp) {
      return res.status(400).json({ success: false, message: 'Invalid start OTP code' });
    }
  }

  // If status is transitioning to 'completed', verify completionOtp if provided
  if (status === 'completed') {
    if (booking.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Booking is already marked as completed' });
    }

    if (!completionOtp) {
      return res.status(400).json({ success: false, message: 'Completion OTP is required to finish the job' });
    }
    if (booking.completionOtp && booking.completionOtp !== completionOtp) {
      return res.status(400).json({ success: false, message: 'Invalid completion OTP code' });
    }

    // Release payment to provider's wallet with Idempotency & Auto-Creation
    const walletsPath = path.join(__dirname, '../data/wallets.json');
    const wallets = fs.existsSync(walletsPath) ? JSON.parse(fs.readFileSync(walletsPath, 'utf-8')) : [];
    const providerId = booking.providerId;

    let wallet = wallets.find((w) => w.providerId === providerId);
    if (!wallet) {
      wallet = {
        id: generateId('wallet'),
        providerId: providerId,
        balance: 0.00,
        pendingPayouts: 0.00,
        transactions: []
      };
      wallets.push(wallet);
    }

    // Idempotency check: Ensure this bookingId has not already been credited to the wallet
    const alreadyCredited = wallet.transactions.some(tx => tx.bookingId === booking.id && tx.type === 'credit');
    if (!alreadyCredited) {
      const payout = booking.providerPayout || booking.subtotal || (booking.hourlyRate * booking.durationHours);
      wallet.balance = Math.round((wallet.balance + payout) * 100) / 100;
      wallet.transactions.push({
        id: generateId('tx'),
        bookingId: booking.id,
        type: 'credit',
        amount: payout,
        description: `Earnings for job completion`,
        timestamp: new Date().toISOString()
      });
      fs.writeFileSync(walletsPath, JSON.stringify(wallets, null, 2));
    }
  }

  // Update fields if provided
  booking.status = status;
  if (photos) {
    booking.photos = { ...booking.photos, ...photos };
  }

  writeJson(bookingsPath, bookings);

  const notifications = readJson(notificationsPath);
  const customerUser = users.find((u) => u.id === booking.customerId);
  const statusMessages = {
    assigned: 'A provider has been assigned to your booking.',
    en_route: 'Your provider is on the way.',
    in_progress: 'Your provider has started the job.',
    completed: 'Your booking is complete. Please leave a review!',
  };
  if (customerUser && statusMessages[status]) {
    notifications.push({
      id: generateId('notif'),
      userId: customerUser.id,
      title: 'Booking Update',
      message: statusMessages[status],
      read: false,
      createdAt: new Date().toISOString(),
    });
    writeJson(notificationsPath, notifications);
  }

  res.json({ success: true, booking: sanitizeBookingForResponse(req, bookings[index]) });
};

exports.decline = (req, res) => {
  const { reason, customReason } = req.body;
  const bookings = readJson(bookingsPath);
  const index = bookings.findIndex((b) => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Booking not found' });
  
  if (req.user.role !== 'provider') {
    return res.status(403).json({ success: false, message: 'Only providers can decline jobs' });
  }

  const users = readJson(usersPath);
  const currentUser = users.find((u) => u.id === req.user.id);
  const pId = currentUser ? currentUser.providerId : null;
  
  if (!pId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const booking = bookings[index];
  if (!booking.declineRecords) booking.declineRecords = [];
  
  const alreadyDeclined = booking.declineRecords.find(d => d.providerId === pId);
  if (!alreadyDeclined) {
    booking.declineRecords.push({
      providerId: pId,
      reason: reason || 'Not specified',
      customReason: customReason || null,
      declinedAt: new Date().toISOString()
    });
  }

  writeJson(bookingsPath, bookings);
  res.json({ success: true, message: 'Job declined successfully' });
};

exports.getDeclined = (req, res) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const users = readJson(usersPath);
  const currentUser = users.find((u) => u.id === req.user.id);
  const pId = currentUser ? currentUser.providerId : null;
  
  if (!pId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const bookings = readJson(bookingsPath);
  const declinedJobs = bookings.filter(b => b.declineRecords && b.declineRecords.some(d => d.providerId === pId));
  
  const sorted = declinedJobs.sort((a, b) => {
    const rA = a.declineRecords.find(d => d.providerId === pId);
    const rB = b.declineRecords.find(d => d.providerId === pId);
    return new Date(rB.declinedAt) - new Date(rA.declinedAt);
  });

  res.json({ 
    success: true, 
    bookings: sorted.map((b) => {
      const customer = users.find(u => u.id === b.customerId);
      const sanitized = sanitizeBookingForResponse(req, b);
      sanitized.customerName = customer ? customer.name : 'Customer';
      return sanitized;
    }) 
  });
};

exports.getStatusFlow = (req, res) => {
  res.json({ success: true, statusFlow: STATUS_FLOW });
};
