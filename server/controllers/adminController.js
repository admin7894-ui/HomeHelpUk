const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateId, generateFakeToken } = require('../utils/helpers');
const { invalidateCategoriesCache } = require('./categoriesController');

// --- 1. ADMIN AUTHENTICATION ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const userRes = await db.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND role = 'admin'`,
      [String(email).trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'admin',
      avatar: user.avatar_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`
    };

    const token = generateFakeToken(userPayload);
    res.json({ success: true, token, user: userPayload });
  } catch (err) {
    console.error('[Admin Login Error]', err);
    res.status(500).json({ success: false, message: 'Admin login failed due to server error' });
  }
};

// --- 2. DASHBOARD METRICS ---
exports.getDashboardStats = async (req, res) => {
  try {
    const catRes = await db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM categories');
    const srvRes = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true AND is_archived = false) as active,
        COUNT(*) FILTER (WHERE is_active = false AND is_archived = false) as inactive,
        COUNT(*) FILTER (WHERE is_archived = true) as archived,
        COUNT(*) FILTER (WHERE price > 0 OR pricing_rules IS NOT NULL) as configured,
        COUNT(*) FILTER (WHERE price = 0 AND (pricing_rules IS NULL OR pricing_rules = '{}'::jsonb)) as missing
      FROM services
    `);

    const recentSrvRes = await db.query(`
      SELECT s.id, s.name, s.price, s.unit, s.is_active, s.created_at, c.name as category_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    const stats = {
      totalCategories: Number(catRes.rows[0].total) || 0,
      activeCategories: Number(catRes.rows[0].active) || 0,
      totalServices: Number(srvRes.rows[0].total) || 0,
      activeServices: Number(srvRes.rows[0].active) || 0,
      inactiveServices: Number(srvRes.rows[0].inactive) || 0,
      archivedServices: Number(srvRes.rows[0].archived) || 0,
      servicesWithPricingConfigured: Number(srvRes.rows[0].configured) || 0,
      servicesMissingConfig: Number(srvRes.rows[0].missing) || 0,
      recentlyUpdatedServices: recentSrvRes.rows
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('[Admin getDashboardStats Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
};

// --- 3. CATEGORY MANAGEMENT ---
exports.getCategories = async (req, res) => {
  try {
    const resCats = await db.query('SELECT * FROM categories ORDER BY order_index ASC, name ASC');
    const categories = resCats.rows.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      price: Number(c.price),
      unit: c.unit,
      description: c.description,
      isActive: Boolean(c.is_active),
      isArchived: Boolean(c.is_archived),
      orderIndex: c.order_index
    }));
    res.json({ success: true, categories });
  } catch (err) {
    console.error('[Admin getCategories Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, icon, price, unit, description, isActive } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const catId = `cat_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const newOrderRes = await db.query('SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM categories');
    const nextOrder = newOrderRes.rows[0].next_order;

    await db.query(
      `INSERT INTO categories (id, name, icon, price, unit, description, is_active, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        catId,
        name,
        icon || 'build-outline',
        Number(price) || 0,
        unit || 'hr',
        description || '',
        isActive !== false,
        nextOrder
      ]
    );

    res.status(201).json({ success: true, message: 'Category created successfully', categoryId: catId });
  } catch (err) {
    console.error('[Admin createCategory Error]', err);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, price, unit, description, isActive, isVisible, imageUrl, orderIndex } = req.body;

    const catCheck = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (catCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await db.query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           icon = COALESCE($2, icon),
           price = COALESCE($3, price),
           unit = COALESCE($4, unit),
           description = COALESCE($5, description),
           is_active = COALESCE($6, is_active),
           is_visible = COALESCE($7, is_visible),
           image_url = COALESCE($8, image_url),
           order_index = COALESCE($9, order_index)
       WHERE id = $10`,
      [
        name,
        icon,
        price !== undefined ? Number(price) : null,
        unit,
        description,
        isActive !== undefined ? Boolean(isActive) : null,
        isVisible !== undefined ? Boolean(isVisible) : null,
        imageUrl,
        orderIndex !== undefined ? Number(orderIndex) : null,
        id
      ]
    );

    invalidateCategoriesCache();

    // Broadcast Socket Event for Catalog Change
    try {
      const socket = require('../utils/socket');
      socket.emitCatalogUpdated('updateCategory', { id });
    } catch (sErr) {}

    res.json({ success: true, message: 'Category updated successfully' });
  } catch (err) {
    console.error('[Admin updateCategory Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category contains active services
    const srvCheck = await db.query('SELECT COUNT(*) as count FROM services WHERE category_id = $1 AND is_active = true AND is_archived = false', [id]);
    const activeCount = Number(srvCheck.rows[0].count);

    if (activeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category containing ${activeCount} active services. Please deactivate or move the services first.`
      });
    }

    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    console.error('[Admin deleteCategory Error]', err);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};

// --- 4. SERVICE MANAGEMENT ---
exports.getServices = async (req, res) => {
  try {
    const { categoryId, status, search } = req.query;
    let queryText = `
      SELECT s.*, c.name as category_name, sub.name as subcategory_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN subcategories sub ON s.subcategory_id = sub.id
      WHERE 1=1
    `;
    const params = [];

    if (categoryId) {
      params.push(categoryId);
      queryText += ` AND s.category_id = $${params.length}`;
    }

    if (status === 'active') {
      queryText += ` AND s.is_active = true AND s.is_archived = false`;
    } else if (status === 'inactive') {
      queryText += ` AND s.is_active = false AND s.is_archived = false`;
    } else if (status === 'archived') {
      queryText += ` AND s.is_archived = true`;
    }

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (LOWER(s.name) LIKE LOWER($${params.length}) OR LOWER(s.id) LIKE LOWER($${params.length}))`;
    }

    queryText += ` ORDER BY s.order_index ASC, s.name ASC`;

    const resSrv = await db.query(queryText, params);
    const services = resSrv.rows.map(srv => ({
      id: srv.id,
      categoryId: srv.category_id,
      categoryName: srv.category_name || 'Uncategorized',
      subcategoryId: srv.subcategory_id,
      subcategoryName: srv.subcategory_name || '',
      name: srv.name,
      price: Number(srv.price),
      unit: srv.unit,
      duration: srv.duration,
      description: srv.description,
      baseIncludes: srv.base_includes,
      additionalCharge: Number(srv.additional_charge),
      maxQuantity: srv.max_quantity,
      whatsIncluded: srv.whats_included || [],
      whatsNotIncluded: srv.whats_not_included || [],
      addons: srv.addons || [],
      faqs: srv.faqs || [],
      pricingRules: srv.pricing_rules || {},
      schedulingConfig: srv.scheduling_config || {},
      bookingRules: srv.booking_rules || {},
      dynamicPricing: srv.dynamic_pricing || {},
      isActive: Boolean(srv.is_active),
      isVisible: Boolean(srv.is_visible),
      isArchived: Boolean(srv.is_archived),
      imageUrl: srv.image_url || '',
      galleryImages: srv.gallery_images || [],
      customerRequirements: srv.customer_requirements || [],
      providerEligibility: srv.provider_eligibility || {},
      orderIndex: srv.order_index
    }));

    res.json({ success: true, services });
  } catch (err) {
    console.error('[Admin getServices Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const srvRes = await db.query(`
      SELECT s.*, c.name as category_name, sub.name as subcategory_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN subcategories sub ON s.subcategory_id = sub.id
      WHERE s.id = $1
    `, [id]);

    if (srvRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const srv = srvRes.rows[0];
    const service = {
      id: srv.id,
      categoryId: srv.category_id,
      categoryName: srv.category_name || 'Uncategorized',
      subcategoryId: srv.subcategory_id,
      subcategoryName: srv.subcategory_name || '',
      name: srv.name,
      price: Number(srv.price),
      unit: srv.unit,
      duration: srv.duration,
      description: srv.description,
      baseIncludes: srv.base_includes,
      additionalCharge: Number(srv.additional_charge),
      maxQuantity: srv.max_quantity,
      whatsIncluded: srv.whats_included || [],
      whatsNotIncluded: srv.whats_not_included || [],
      addons: srv.addons || [],
      faqs: srv.faqs || [],
      pricingRules: srv.pricing_rules || {},
      schedulingConfig: srv.scheduling_config || {},
      bookingRules: srv.booking_rules || {},
      dynamicPricing: srv.dynamic_pricing || {},
      isActive: Boolean(srv.is_active),
      isVisible: Boolean(srv.is_visible),
      isArchived: Boolean(srv.is_archived),
      imageUrl: srv.image_url || '',
      galleryImages: srv.gallery_images || [],
      customerRequirements: srv.customer_requirements || [],
      providerEligibility: srv.provider_eligibility || {},
      orderIndex: srv.order_index
    };

    res.json({ success: true, service });
  } catch (err) {
    console.error('[Admin getServiceById Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch service detail' });
  }
};

exports.createService = async (req, res) => {
  try {
    const {
      name, categoryId, subcategoryId, price, unit, duration, description,
      baseIncludes, additionalCharge, maxQuantity, whatsIncluded, whatsNotIncluded,
      addons, faqs, pricingRules, schedulingConfig, bookingRules, imageUrl, galleryImages,
      customerRequirements, providerEligibility, isActive
    } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ success: false, message: 'Service name and categoryId are required' });
    }

    const srvId = `service_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const newOrderRes = await db.query('SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM services');
    const nextOrder = newOrderRes.rows[0].next_order;

    await db.query(
      `INSERT INTO services (
         id, subcategory_id, category_id, name, price, unit, duration, description,
         base_includes, additional_charge, max_quantity, whats_included, whats_not_included,
         addons, faqs, pricing_rules, scheduling_config, booking_rules, is_active, is_visible, is_archived,
         image_url, gallery_images, customer_requirements, provider_eligibility, order_index
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, true, false, $20, $21, $22, $23, $24)`,
      [
        srvId,
        subcategoryId || null,
        categoryId,
        name,
        Number(price) || 0,
        unit || 'visit',
        duration || '1-2 hrs',
        description || '',
        baseIncludes || '',
        Number(additionalCharge) || 0,
        maxQuantity || 10,
        JSON.stringify(whatsIncluded || []),
        JSON.stringify(whatsNotIncluded || []),
        JSON.stringify(addons || []),
        JSON.stringify(faqs || []),
        JSON.stringify(pricingRules || {}),
        JSON.stringify(schedulingConfig || {}),
        JSON.stringify(bookingRules || {}),
        isActive !== false,
        imageUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
        JSON.stringify(galleryImages || []),
        JSON.stringify(customerRequirements || []),
        JSON.stringify(providerEligibility || {}),
        nextOrder
      ]
    );

    res.status(201).json({ success: true, message: 'Service created successfully', serviceId: srvId });
  } catch (err) {
    console.error('[Admin createService Error]', err);
    res.status(500).json({ success: false, message: 'Failed to create service' });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, categoryId, subcategoryId, price, unit, duration, description,
      baseIncludes, additionalCharge, maxQuantity, whatsIncluded, whatsNotIncluded,
      addons, faqs, pricingRules, schedulingConfig, bookingRules, imageUrl, galleryImages,
      customerRequirements, providerEligibility, isActive, isVisible, isArchived, orderIndex
    } = req.body;

    const srvCheck = await db.query('SELECT * FROM services WHERE id = $1', [id]);
    if (srvCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    await db.query(
      `UPDATE services
       SET name = COALESCE($1, name),
           category_id = COALESCE($2, category_id),
           subcategory_id = COALESCE($3, subcategory_id),
           price = COALESCE($4, price),
           unit = COALESCE($5, unit),
           duration = COALESCE($6, duration),
           description = COALESCE($7, description),
           base_includes = COALESCE($8, base_includes),
           additional_charge = COALESCE($9, additional_charge),
           max_quantity = COALESCE($10, max_quantity),
           whats_included = COALESCE($11, whats_included),
           whats_not_included = COALESCE($12, whats_not_included),
           addons = COALESCE($13, addons),
           faqs = COALESCE($14, faqs),
           pricing_rules = COALESCE($15, pricing_rules),
           scheduling_config = COALESCE($16, scheduling_config),
           booking_rules = COALESCE($17, booking_rules),
           image_url = COALESCE($18, image_url),
           gallery_images = COALESCE($19, gallery_images),
           customer_requirements = COALESCE($20, customer_requirements),
           provider_eligibility = COALESCE($21, provider_eligibility),
           is_active = COALESCE($22, is_active),
           is_visible = COALESCE($23, is_visible),
           is_archived = COALESCE($24, is_archived),
           order_index = COALESCE($25, order_index)
       WHERE id = $26`,
      [
        name,
        categoryId,
        subcategoryId,
        price !== undefined ? Number(price) : null,
        unit,
        duration,
        description,
        baseIncludes,
        additionalCharge !== undefined ? Number(additionalCharge) : null,
        maxQuantity !== undefined ? Number(maxQuantity) : null,
        whatsIncluded !== undefined ? JSON.stringify(whatsIncluded) : null,
        whatsNotIncluded !== undefined ? JSON.stringify(whatsNotIncluded) : null,
        addons !== undefined ? JSON.stringify(addons) : null,
        faqs !== undefined ? JSON.stringify(faqs) : null,
        pricingRules !== undefined ? JSON.stringify(pricingRules) : null,
        schedulingConfig !== undefined ? JSON.stringify(schedulingConfig) : null,
        bookingRules !== undefined ? JSON.stringify(bookingRules) : null,
        imageUrl,
        galleryImages !== undefined ? JSON.stringify(galleryImages) : null,
        customerRequirements !== undefined ? JSON.stringify(customerRequirements) : null,
        providerEligibility !== undefined ? JSON.stringify(providerEligibility) : null,
        isActive !== undefined ? Boolean(isActive) : null,
        isVisible !== undefined ? Boolean(isVisible) : null,
        isArchived !== undefined ? Boolean(isArchived) : null,
        orderIndex !== undefined ? Number(orderIndex) : null,
        id
      ]
    );

    invalidateCategoriesCache();
    res.json({ success: true, message: 'Service updated successfully' });
  } catch (err) {
    console.error('[Admin updateService Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update service' });
  }
};

exports.toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    await db.query('UPDATE services SET is_active = $1 WHERE id = $2', [Boolean(isActive), id]);
    res.json({ success: true, message: `Service status updated to ${isActive ? 'active' : 'inactive'}` });
  } catch (err) {
    console.error('[Admin toggleServiceStatus Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update service status' });
  }
};

exports.archiveService = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE services SET is_archived = true, is_active = false WHERE id = $1', [id]);
    res.json({ success: true, message: 'Service archived successfully' });
  } catch (err) {
    console.error('[Admin archiveService Error]', err);
    res.status(500).json({ success: false, message: 'Failed to archive service' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const resSettings = await db.query('SELECT * FROM platform_settings ORDER BY key ASC');
    res.json({ success: true, settings: resSettings.rows });
  } catch (err) {
    console.error('[Admin getSettings Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch platform settings' });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    await db.query(
      `INSERT INTO platform_settings (key, value, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         description = COALESCE(EXCLUDED.description, platform_settings.description),
         updated_at = NOW();`,
      [key, String(value), description || null]
    );

    res.json({ success: true, message: `Setting '${key}' updated successfully` });
  } catch (err) {
    console.error('[Admin updateSetting Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update platform setting' });
  }
};

// --- 6. PROVIDER MANAGEMENT ---
exports.getProviders = async (req, res) => {
  try {
    const { search, status, verified } = req.query;

    let queryText = `
      SELECT p.id, p.user_id, p.bio, p.postcode, p.service_radius_miles, p.verified, p.is_active,
             p.rating, p.review_count, p.completed_jobs, p.documents, p.created_at, p.updated_at,
             u.name, u.email, u.phone, u.avatar_url,
             COALESCE(
               (SELECT JSON_AGG(c.name)
                FROM provider_categories pc
                JOIN categories c ON pc.category_id = c.id
                WHERE pc.provider_id = p.id), '[]'::json
             ) as categories,
             COALESCE(
               (SELECT JSON_AGG(JSON_BUILD_OBJECT('serviceId', ps.service_id, 'name', s.name, 'enabled', ps.enabled))
                FROM provider_services ps
                JOIN services s ON ps.service_id = s.id
                WHERE ps.provider_id = p.id), '[]'::json
             ) as services
      FROM providers p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (LOWER(u.name) LIKE LOWER($${params.length}) OR LOWER(u.email) LIKE LOWER($${params.length}) OR LOWER(u.phone) LIKE LOWER($${params.length}))`;
    }

    if (status === 'active') {
      queryText += ` AND p.is_active = true`;
    } else if (status === 'inactive') {
      queryText += ` AND p.is_active = false`;
    }

    if (verified === 'verified') {
      queryText += ` AND p.verified = true`;
    } else if (verified === 'unverified') {
      queryText += ` AND p.verified = false`;
    }

    queryText += ` ORDER BY p.created_at DESC`;

    const resProv = await db.query(queryText, params);
    const providers = resProv.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name || 'Provider',
      email: r.email || '',
      phone: r.phone || '',
      avatar: r.avatar_url || '',
      isActive: r.is_active !== false,
      verified: Boolean(r.verified),
      postcode: r.postcode || '',
      serviceRadiusMiles: Number(r.service_radius_miles) || 10,
      rating: Number(r.rating) || 5.0,
      reviewCount: Number(r.review_count) || 0,
      completedJobs: Number(r.completed_jobs) || 0,
      categories: r.categories || [],
      services: r.services || [],
      documents: r.documents || {},
      createdAt: r.created_at
    }));

    res.json({ success: true, providers });
  } catch (err) {
    console.error('[Admin getProviders Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch providers' });
  }
};

exports.getProviderById = async (req, res) => {
  try {
    const { id } = req.params;
    const provRes = await db.query(`
      SELECT p.*, u.name, u.email, u.phone, u.avatar_url
      FROM providers p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (provRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const r = provRes.rows[0];

    const catRes = await db.query(`
      SELECT c.id, c.name FROM provider_categories pc JOIN categories c ON pc.category_id = c.id WHERE pc.provider_id = $1
    `, [id]);

    const srvRes = await db.query(`
      SELECT ps.service_id, ps.enabled, s.name, s.price, s.unit, c.name as category_name
      FROM provider_services ps
      JOIN services s ON ps.service_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE ps.provider_id = $1
    `, [id]);

    const provider = {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      avatar: r.avatar_url,
      bio: r.bio,
      isActive: r.is_active !== false,
      verified: Boolean(r.verified),
      postcode: r.postcode,
      serviceRadiusMiles: Number(r.service_radius_miles),
      rating: Number(r.rating),
      reviewCount: Number(r.review_count),
      completedJobs: Number(r.completed_jobs),
      weeklyAvailability: r.weekly_availability || {},
      vacationMode: Boolean(r.vacation_mode),
      emergencyUnavailable: Boolean(r.emergency_unavailable),
      documents: r.documents || {},
      bankDetails: r.bank_details || {},
      categories: catRes.rows,
      services: srvRes.rows.map(s => ({
        serviceId: s.service_id,
        name: s.name,
        categoryName: s.category_name,
        price: Number(s.price),
        unit: s.unit,
        enabled: Boolean(s.enabled)
      })),
      createdAt: r.created_at
    };

    res.json({ success: true, provider });
  } catch (err) {
    console.error('[Admin getProviderById Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch provider detail' });
  }
};

exports.updateProviderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, verified } = req.body;

    const pCheck = await db.query('SELECT user_id FROM providers WHERE id = $1', [id]);
    if (pCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Provider not found' });

    if (isActive !== undefined) {
      await db.query('UPDATE providers SET is_active = $1 WHERE id = $2', [Boolean(isActive), id]);
    }

    if (verified !== undefined) {
      await db.query('UPDATE providers SET verified = $1 WHERE id = $2', [Boolean(verified), id]);
    }

    res.json({ success: true, message: 'Provider status updated successfully' });
  } catch (err) {
    console.error('[Admin updateProviderStatus Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update provider status' });
  }
};

exports.toggleProviderServiceAccess = async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const { enabled } = req.body;

    const psId = `ps_${id}_${serviceId}`;
    await db.query(
      `INSERT INTO provider_services (id, provider_id, service_id, enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider_id, service_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         updated_at = NOW();`,
      [psId, id, serviceId, Boolean(enabled)]
    );

    res.json({ success: true, message: `Provider service access updated` });
  } catch (err) {
    console.error('[Admin toggleProviderServiceAccess Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update provider service access' });
  }
};

