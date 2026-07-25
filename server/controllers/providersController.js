const db = require('../db');
const { hasTimeOverlap } = require('../utils/helpers');
const { isPricingModelAllowed } = require('../utils/pricingModelScoping');

async function formatProviderRecord(pRow) {
  // Fetch provider categories
  const catRes = await db.query('SELECT category_id FROM provider_categories WHERE provider_id = $1', [pRow.id]);
  const categories = catRes.rows.map(r => r.category_id);

  // Fetch provider services
  const psRes = await db.query('SELECT * FROM provider_services WHERE provider_id = $1', [pRow.id]);
  const services = psRes.rows.map(ps => ({
    serviceId: ps.service_id,
    customPrice: ps.custom_price !== null ? Number(ps.custom_price) : undefined,
    enabled: ps.enabled,
    customDescription: ps.custom_description,
    customWhatsIncluded: ps.custom_whats_included,
    customWhatsNotIncluded: ps.custom_whats_not_included,
    customAddOns: ps.custom_addons,
    customFaqs: ps.custom_faqs,
    pricingRules: ps.pricing_rules
  }));

  // Fetch user details for name / avatar
  const userRes = await db.query('SELECT name, avatar_url FROM users WHERE id = $1', [pRow.user_id]);
  const u = userRes.rows[0] || {};

  return {
    id: pRow.id,
    userId: pRow.user_id,
    name: u.name || 'Provider',
    avatar: u.avatar_url || '',
    bio: pRow.bio || '',
    categories,
    services,
    postcode: pRow.postcode || '',
    serviceRadiusMiles: Number(pRow.service_radius_miles) || 10,
    availability: {
      weekly: pRow.weekly_availability || {},
      holidays: pRow.holidays || [],
      vacationMode: Boolean(pRow.vacation_mode),
      emergencyUnavailable: Boolean(pRow.emergency_unavailable)
    },
    documents: pRow.documents || {},
    bankDetails: pRow.bank_details || {},
    rating: Number(pRow.rating) || 5.0,
    reviewCount: Number(pRow.review_count) || 0,
    verified: Boolean(pRow.verified),
    completedJobs: Number(pRow.completed_jobs) || 0
  };
}

exports.getAll = async (req, res) => {
  try {
    const { categoryId, serviceId, search, date, time, durationHours } = req.query;
    const provRes = await db.query('SELECT * FROM providers ORDER BY rating DESC');
    let providers = [];

    for (const pRow of provRes.rows) {
      const formatted = await formatProviderRecord(pRow);
      providers.push(formatted);
    }

    if (serviceId) {
      providers = providers.filter((p) => p.services && p.services.some(s => typeof s === 'string' ? s === serviceId : s.serviceId === serviceId && s.enabled !== false));
    } else if (categoryId) {
      providers = providers.filter((p) => p.categories.includes(categoryId));
    }
    if (search) {
      const term = String(search).toLowerCase();
      providers = providers.filter((p) => p.name.toLowerCase().includes(term));
    }

    if (date && time) {
      const activeStatuses = ['pending', 'assigned', 'en_route', 'in_progress', 'confirmed', 'accepted'];
      const activeBookingsRes = await db.query(
        `SELECT provider_id, date, time, duration_hours as "durationHours", status
         FROM bookings
         WHERE status = ANY($1)`,
        [activeStatuses]
      );

      const activeBookings = activeBookingsRes.rows.map(b => ({
        ...b,
        durationHours: Number(b.durationHours)
      }));

      const newBookingTimeSlot = { date, time, durationHours: durationHours || 1 };

      providers = providers.filter(provider => {
        const providerActiveBookings = activeBookings.filter(b => b.provider_id === provider.id);
        const isBusy = providerActiveBookings.some(active => hasTimeOverlap(newBookingTimeSlot, active));
        return !isBusy;
      });
    }

    res.json({ success: true, providers });
  } catch (err) {
    console.error('[Providers getAll Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch providers' });
  }
};

exports.getById = async (req, res) => {
  try {
    const provRes = await db.query('SELECT * FROM providers WHERE id = $1', [req.params.id]);
    if (provRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Provider not found' });

    const provider = await formatProviderRecord(provRes.rows[0]);

    const reviewsRes = await db.query(
      `SELECT r.id, r.booking_id as "bookingId", r.provider_id as "providerId", r.customer_id as "customerId",
              r.rating, r.comment, r.created_at as "createdAt"
       FROM reviews r
       WHERE r.provider_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({ success: true, provider, reviews: reviewsRes.rows });
  } catch (err) {
    console.error('[Providers getById Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch provider detail' });
  }
};

exports.update = async (req, res) => {
  try {
    const userRes = await db.query('SELECT p.id as provider_id FROM users u JOIN providers p ON u.id = p.user_id WHERE u.id = $1', [req.user.id]);
    const pId = userRes.rows[0] ? userRes.rows[0].provider_id : null;

    if (req.user.role !== 'provider' || pId !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied: not your provider profile' });
    }

    const { bio, categories, services, postcode, serviceRadiusMiles, availability, documents, bankDetails, verified } = req.body;

    const currentProv = await db.query('SELECT * FROM providers WHERE id = $1', [req.params.id]);
    if (currentProv.rows.length === 0) return res.status(404).json({ success: false, message: 'Provider not found' });
    const c = currentProv.rows[0];

    const newBio = bio !== undefined ? bio : c.bio;
    const newPostcode = postcode !== undefined ? postcode : c.postcode;
    const newRadius = serviceRadiusMiles !== undefined ? Number(serviceRadiusMiles) : c.service_radius_miles;
    const newVerified = verified !== undefined ? Boolean(verified) : c.verified;

    const mergedAvailability = availability ? {
      weekly: availability.weekly || c.weekly_availability,
      holidays: availability.holidays || c.holidays,
      vacationMode: availability.vacationMode !== undefined ? availability.vacationMode : c.vacation_mode,
      emergencyUnavailable: availability.emergencyUnavailable !== undefined ? availability.emergencyUnavailable : c.emergency_unavailable
    } : {
      weekly: c.weekly_availability,
      holidays: c.holidays,
      vacationMode: c.vacation_mode,
      emergencyUnavailable: c.emergency_unavailable
    };

    const newDocs = documents !== undefined ? { ...c.documents, ...documents } : c.documents;
    const newBank = bankDetails !== undefined ? { ...c.bank_details, ...bankDetails } : c.bank_details;

    await db.query(
      `UPDATE providers
       SET bio = $1, postcode = $2, service_radius_miles = $3, verified = $4,
           weekly_availability = $5, holidays = $6, vacation_mode = $7, emergency_unavailable = $8,
           documents = $9, bank_details = $10, updated_at = NOW()
       WHERE id = $11`,
      [
        newBio, newPostcode, newRadius, newVerified,
        JSON.stringify(mergedAvailability.weekly || {}),
        JSON.stringify(mergedAvailability.holidays || []),
        mergedAvailability.vacationMode,
        mergedAvailability.emergencyUnavailable,
        JSON.stringify(newDocs),
        JSON.stringify(newBank),
        req.params.id
      ]
    );

    // Update categories junction table if provided
    if (Array.isArray(categories)) {
      await db.query('DELETE FROM provider_categories WHERE provider_id = $1', [req.params.id]);
      for (const catId of categories) {
        await db.query(
          'INSERT INTO provider_categories (provider_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.params.id, catId]
        );
      }
    }

    const updatedProv = await db.query('SELECT * FROM providers WHERE id = $1', [req.params.id]);
    const formatted = await formatProviderRecord(updatedProv.rows[0]);
    res.json({ success: true, provider: formatted });
  } catch (err) {
    console.error('[Providers update Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update provider profile' });
  }
};

exports.updateServiceDetail = async (req, res) => {
  try {
    const { id: providerId, serviceId } = req.params;

    const userRes = await db.query('SELECT p.id as provider_id FROM users u JOIN providers p ON u.id = p.user_id WHERE u.id = $1', [req.user.id]);
    const pId = userRes.rows[0] ? userRes.rows[0].provider_id : null;

    if (req.user.role !== 'provider' || pId !== providerId) {
      return res.status(403).json({ success: false, message: 'Access denied: not your provider profile' });
    }

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

    const srvRes = await db.query('SELECT c.name as category_name FROM services s JOIN categories c ON s.category_id = c.id WHERE s.id = $1', [serviceId]);
    const categoryName = srvRes.rows[0] ? srvRes.rows[0].category_name : null;

    if (pricingRules && pricingRules.pricingModel) {
      if (!isPricingModelAllowed(serviceId, categoryName, pricingRules.pricingModel, pricingRules.enabledModels)) {
        return res.status(400).json({
          success: false,
          message: `Invalid pricing model '${pricingRules.pricingModel}' for service '${serviceId}' in category '${categoryName || 'Unknown'}'`
        });
      }
    }

    const psId = `ps_${providerId}_${serviceId}`;
    await db.query(
      `INSERT INTO provider_services (
         id, provider_id, service_id, custom_price, enabled, custom_description,
         custom_whats_included, custom_whats_not_included, custom_addons, custom_faqs, pricing_rules
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (provider_id, service_id) DO UPDATE SET
         custom_price = COALESCE(EXCLUDED.custom_price, provider_services.custom_price),
         enabled = COALESCE(EXCLUDED.enabled, provider_services.enabled),
         custom_description = COALESCE(EXCLUDED.custom_description, provider_services.custom_description),
         custom_whats_included = COALESCE(EXCLUDED.custom_whats_included, provider_services.custom_whats_included),
         custom_whats_not_included = COALESCE(EXCLUDED.custom_whats_not_included, provider_services.custom_whats_not_included),
         custom_addons = COALESCE(EXCLUDED.custom_addons, provider_services.custom_addons),
         custom_faqs = COALESCE(EXCLUDED.custom_faqs, provider_services.custom_faqs),
         pricing_rules = COALESCE(EXCLUDED.pricing_rules, provider_services.pricing_rules),
         updated_at = NOW();`,
      [
        psId,
        providerId,
        serviceId,
        customPrice !== undefined ? Number(customPrice) : null,
        enabled !== undefined ? Boolean(enabled) : true,
        customDescription !== undefined ? customDescription : null,
        customWhatsIncluded !== undefined ? JSON.stringify(customWhatsIncluded) : null,
        customWhatsNotIncluded !== undefined ? JSON.stringify(customWhatsNotIncluded) : null,
        customAddOns !== undefined ? JSON.stringify(customAddOns) : null,
        customFaqs !== undefined ? JSON.stringify(customFaqs) : null,
        pricingRules !== undefined ? JSON.stringify(pricingRules) : null
      ]
    );

    const provRes = await db.query('SELECT * FROM providers WHERE id = $1', [providerId]);
    const formatted = await formatProviderRecord(provRes.rows[0]);
    res.json({ success: true, provider: formatted });
  } catch (err) {
    console.error('[Providers updateServiceDetail Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update provider service details' });
  }
};
