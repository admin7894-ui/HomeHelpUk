const fs = require('fs');
const path = require('path');
const { hasTimeOverlap } = require('../utils/helpers');

const providersPath = path.join(__dirname, '../data/providers.json');
const reviewsPath = path.join(__dirname, '../data/reviews.json');
const bookingsPath = path.join(__dirname, '../data/bookings.json');

function readProviders() {
  return JSON.parse(fs.readFileSync(providersPath, 'utf-8'));
}

exports.getAll = (req, res) => {
  const { categoryId, serviceId, search } = req.query;
  let providers = readProviders();

  if (serviceId) {
    providers = providers.filter((p) => p.services && p.services.some(s => typeof s === 'string' ? s === serviceId : s.serviceId === serviceId && s.enabled !== false));
  } else if (categoryId) {
    providers = providers.filter((p) => p.categories.includes(categoryId));
  }
  if (search) {
    const term = String(search).toLowerCase();
    providers = providers.filter((p) => p.name.toLowerCase().includes(term));
  }

  const { date, time, durationHours } = req.query;
  if (date && time) {
    let bookings = [];
    try {
      bookings = JSON.parse(fs.readFileSync(bookingsPath, 'utf-8'));
    } catch(err) {
      // Ignore
    }
    
    const activeStatuses = ['pending', 'assigned', 'en_route', 'in_progress', 'confirmed', 'accepted'];
    const activeBookings = bookings.filter(b => activeStatuses.includes(b.status));
    const newBookingTimeSlot = { date, time, durationHours: durationHours || 1 };

    providers = providers.filter(provider => {
      // Check if this provider has any overlapping booking
      const providerActiveBookings = activeBookings.filter(b => b.providerId === provider.id);
      const isBusy = providerActiveBookings.some(active => hasTimeOverlap(newBookingTimeSlot, active));
      return !isBusy;
    });
  }

  res.json({ success: true, providers });
};

exports.getById = (req, res) => {
  const providers = readProviders();
  const provider = providers.find((p) => p.id === req.params.id);
  if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

  const reviews = JSON.parse(fs.readFileSync(reviewsPath, 'utf-8')).filter(
    (r) => r.providerId === provider.id
  );

  res.json({ success: true, provider, reviews });
};

function writeProviders(providers) {
  fs.writeFileSync(providersPath, JSON.stringify(providers, null, 2));
}

exports.update = (req, res) => {
  const providers = readProviders();
  const index = providers.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Provider not found' });

  // Security Check: Look up providerId from users.json since JWT does not store it
  const usersPath = path.join(__dirname, '../data/users.json');
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  const user = users.find((u) => u.id === req.user.id);
  const pId = user ? user.providerId : null;

  if (req.user.role !== 'provider' || pId !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Access denied: not your provider profile' });
  }

  const { bio, categories, services, postcode, serviceRadiusMiles, availability, documents, bankDetails, verified } = req.body;

  if (bio !== undefined) providers[index].bio = bio;
  if (categories !== undefined) providers[index].categories = categories;
  if (services !== undefined) providers[index].services = services;
  if (postcode !== undefined) providers[index].postcode = postcode;
  if (serviceRadiusMiles !== undefined) providers[index].serviceRadiusMiles = Number(serviceRadiusMiles);
  
  if (availability !== undefined) {
    providers[index].availability = { ...providers[index].availability, ...availability };
  }
  if (documents !== undefined) {
    providers[index].documents = { ...providers[index].documents, ...documents };
  }
  if (bankDetails !== undefined) {
    providers[index].bankDetails = { ...providers[index].bankDetails, ...bankDetails };
  }
  if (verified !== undefined) providers[index].verified = verified;

  writeProviders(providers);
  res.json({ success: true, provider: providers[index] });
};

exports.updateServiceDetail = (req, res) => {
  const { id: providerId, serviceId } = req.params;
  const providers = readProviders();
  const index = providers.findIndex((p) => p.id === providerId);
  if (index === -1) return res.status(404).json({ success: false, message: 'Provider not found' });

  // Security check: verify logged in provider matches
  const usersPath = path.join(__dirname, '../data/users.json');
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  const user = users.find((u) => u.id === req.user.id);
  const pId = user ? user.providerId : null;

  if (req.user.role !== 'provider' || pId !== providerId) {
    return res.status(403).json({ success: false, message: 'Access denied: not your provider profile' });
  }

  if (!providers[index].services) {
    providers[index].services = [];
  }

  let srvIndex = providers[index].services.findIndex((s) => typeof s === 'string' ? s === serviceId : s.serviceId === serviceId);

  const { findCanonicalService } = require('../utils/serviceMerger');
  const { isPricingModelAllowed } = require('../utils/pricingModelScoping');
  const categoriesPath = path.join(__dirname, '../data/categories.json');
  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  const { mainCategory } = findCanonicalService(categories, serviceId);

  const {
    customPrice,
    enabled,
    customDescription,
    customWhatsIncluded,
    customWhatsNotIncluded,
    customAddOns,
    customFaqs,
    pricingRules
  } = req.body;

  if (pricingRules && pricingRules.pricingModel) {
    const categoryName = mainCategory ? mainCategory.name : null;
    if (!isPricingModelAllowed(serviceId, categoryName, pricingRules.pricingModel, pricingRules.enabledModels)) {
      return res.status(400).json({
        success: false,
        message: `Invalid pricing model '${pricingRules.pricingModel}' for service '${serviceId}' in category '${categoryName || 'Unknown'}'`
      });
    }
  }

  if (srvIndex === -1) {
    // Add new service entry
    const newEntry = {
      serviceId,
      customPrice: customPrice !== undefined ? Number(customPrice) : 20,
      enabled: enabled !== undefined ? enabled : true,
    };
    if (customDescription !== undefined) newEntry.customDescription = customDescription;
    if (customWhatsIncluded !== undefined) newEntry.customWhatsIncluded = customWhatsIncluded;
    if (customWhatsNotIncluded !== undefined) newEntry.customWhatsNotIncluded = customWhatsNotIncluded;
    if (customAddOns !== undefined) newEntry.customAddOns = customAddOns;
    if (customFaqs !== undefined) newEntry.customFaqs = customFaqs;
    if (pricingRules !== undefined) newEntry.pricingRules = pricingRules;
    providers[index].services.push(newEntry);
  } else {
    // Update existing service entry
    let existing = providers[index].services[srvIndex];
    if (typeof existing === 'string') {
      existing = { serviceId: existing, customPrice: 20, enabled: true };
    }

    if (customPrice !== undefined) existing.customPrice = Number(customPrice);
    if (enabled !== undefined) existing.enabled = Boolean(enabled);
    if (customDescription !== undefined) existing.customDescription = customDescription;
    if (customWhatsIncluded !== undefined) existing.customWhatsIncluded = customWhatsIncluded;
    if (customWhatsNotIncluded !== undefined) existing.customWhatsNotIncluded = customWhatsNotIncluded;
    if (customAddOns !== undefined) existing.customAddOns = customAddOns;
    if (customFaqs !== undefined) existing.customFaqs = customFaqs;
    if (pricingRules !== undefined) existing.pricingRules = { ...existing.pricingRules, ...pricingRules };

    providers[index].services[srvIndex] = existing;
  }

  writeProviders(providers);
  res.json({ success: true, provider: providers[index] });
};
