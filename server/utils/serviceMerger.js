/**
 * Utility to merge platform canonical service defaults with provider-specific records.
 * STRICT RULE: Provider records are allowed ONLY to control `enabled` status.
 * All global pricing, descriptions, inclusions, exclusions, add-ons, FAQs, and eligibility
 * remain 100% Admin-controlled.
 */

function findCanonicalService(categories, serviceId) {
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

function mergeServiceDetails(canonicalService, providerServiceRecord = null) {
  if (!canonicalService) return null;

  const srv = { ...canonicalService };

  const platformAddOns = srv.customAddOns || srv.addOns || srv.addons || [];
  const platformWhatsIncluded = Array.isArray(srv.whatsIncluded) ? srv.whatsIncluded : (srv.baseIncludes ? [srv.baseIncludes] : []);
  const platformWhatsNotIncluded = Array.isArray(srv.whatsNotIncluded) ? srv.whatsNotIncluded : [];
  const platformFaqs = Array.isArray(srv.faqs) ? srv.faqs : [];
  
  const platformPricingRules = srv.pricingRules || {
    basePrice: srv.price || 0,
    includedQuantity: 1,
    additionalUnitPrice: srv.additionalCharge || 0,
    unitType: srv.unit || 'visit',
    pricingType: srv.unit === 'hr' ? 'hourly' : 'fixed',
    maxQuantity: srv.maxQuantity || 0
  };

  const isEnabled = providerServiceRecord ? providerServiceRecord.enabled !== false : true;

  return {
    ...srv,
    enabled: isEnabled,
    whatsIncluded: platformWhatsIncluded,
    whatsNotIncluded: platformWhatsNotIncluded,
    customAddOns: platformAddOns,
    addons: platformAddOns,
    availableAddOns: platformAddOns,
    faqs: platformFaqs,
    pricingRules: platformPricingRules,
    effectivePrice: Number(srv.price) || 0,
    providerOverrideApplied: false
  };
}

module.exports = {
  findCanonicalService,
  mergeServiceDetails
};
