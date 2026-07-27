const db = require('../db');
const { mergeServiceDetails } = require('../utils/serviceMerger');

async function fetchFullCategoriesHierarchy() {
  const catRes = await db.query('SELECT * FROM categories ORDER BY order_index ASC, name ASC');
  const subRes = await db.query('SELECT * FROM subcategories ORDER BY name ASC');
  const srvRes = await db.query('SELECT * FROM services ORDER BY order_index ASC, name ASC');

  const categories = catRes.rows.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    imageUrl: cat.image_url || '',
    price: Number(cat.price),
    unit: cat.unit,
    description: cat.description,
    isVisible: cat.is_visible !== false,
    subcategories: subRes.rows
      .filter(sub => sub.category_id === cat.id)
      .map(sub => ({
        id: sub.id,
        name: sub.name,
        services: srvRes.rows
          .filter(srv =>
            (srv.subcategory_id === sub.id || srv.category_id === cat.id) &&
            srv.is_active !== false &&
            srv.is_archived !== true &&
            srv.is_visible !== false
          )
          .map(srv => ({
            id: srv.id,
            name: srv.name,
            price: Number(srv.price),
            unit: srv.unit,
            duration: srv.duration,
            description: srv.description,
            imageUrl: srv.image_url || '',
            galleryImages: srv.gallery_images || [],
            ukTypicalPrice: srv.uk_typical_price,
            londonPrice: srv.london_price,
            mvpPrice: Number(srv.price),
            canaryWharfPrice: srv.canary_wharf_price,
            baseIncludes: srv.base_includes,
            additionalCharge: Number(srv.additional_charge),
            maxQuantity: srv.max_quantity,
            whatsIncluded: srv.whats_included || [],
            includedItems: srv.whats_included || [],
            whatsNotIncluded: srv.whats_not_included || [],
            notIncludedItems: srv.whats_not_included || [],
            addons: srv.addons || [],
            availableAddOns: srv.addons || [],
            faqs: srv.faqs || [],
            pricingRules: srv.pricing_rules || {},
            schedulingConfig: srv.scheduling_config || {},
            bookingRules: srv.booking_rules || {},
            customerRequirements: srv.customer_requirements || [],
            providerEligibility: srv.provider_eligibility || {},
            dynamicPricing: srv.dynamic_pricing || {}
          }))
      }))
      .filter(sub => sub.services.length > 0)
  })).filter(cat => cat.subcategories.length > 0);

  return categories;
}

function findCategoryOrServiceInHierarchy(categories, id) {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        if (sub.id === id) return sub;
        if (sub.services) {
          for (const service of sub.services) {
            if (service.id === id) return service;
          }
        }
      }
    }
  }
  return null;
}

function findCanonicalServiceInHierarchy(categories, serviceId) {
  for (const cat of categories) {
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        if (sub.services) {
          const match = sub.services.find(s => s.id === serviceId);
          if (match) return { service: match, mainCategory: cat, subCategory: sub };
        }
      }
    }
  }
  return { service: null, mainCategory: null, subCategory: null };
}

exports.getAll = async (req, res) => {
  try {
    const categories = await fetchFullCategoriesHierarchy();
    res.json({ success: true, categories });
  } catch (err) {
    console.error('[Categories getAll Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

exports.getById = async (req, res) => {
  try {
    const categories = await fetchFullCategoriesHierarchy();
    const category = findCategoryOrServiceInHierarchy(categories, req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category or service not found' });
    res.json({ success: true, category });
  } catch (err) {
    console.error('[Categories getById Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch category detail' });
  }
};

exports.getServiceDetail = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { providerId } = req.query;

    const categories = await fetchFullCategoriesHierarchy();
    const { service, mainCategory } = findCanonicalServiceInHierarchy(categories, serviceId);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    let providerServiceRecord = null;
    if (providerId) {
      const psRes = await db.query(
        `SELECT * FROM provider_services WHERE provider_id = $1 AND service_id = $2`,
        [providerId, serviceId]
      );
      if (psRes.rows.length > 0) {
        const ps = psRes.rows[0];
        providerServiceRecord = {
          serviceId: ps.service_id,
          customPrice: ps.custom_price !== null ? Number(ps.custom_price) : undefined,
          enabled: ps.enabled,
          customDescription: ps.custom_description,
          customWhatsIncluded: ps.custom_whats_included,
          customWhatsNotIncluded: ps.custom_whats_not_included,
          customAddOns: ps.custom_addons,
          customFaqs: ps.custom_faqs,
          pricingRules: ps.pricing_rules
        };
      }
    }

    const mergedService = mergeServiceDetails(service, providerServiceRecord);
    res.json({ success: true, service: mergedService, mainCategory });
  } catch (err) {
    console.error('[Categories getServiceDetail Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch service detail' });
  }
};
