/**
 * Utility to merge platform canonical service defaults with provider-specific overrides.
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

  // Normalize property names for customAddOns
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

  if (!providerServiceRecord) {
    return {
      ...srv,
      whatsIncluded: platformWhatsIncluded,
      whatsNotIncluded: platformWhatsNotIncluded,
      customAddOns: platformAddOns,
      faqs: platformFaqs,
      pricingRules: platformPricingRules,
      effectivePrice: srv.price || 0
    };
  }

  // Apply Provider Overrides if enabled
  const customPrice = Number(providerServiceRecord.customPrice) || Number(providerServiceRecord.price) || srv.price;
  
  const mergedWhatsIncluded = Array.isArray(providerServiceRecord.customWhatsIncluded) && providerServiceRecord.customWhatsIncluded.length > 0
    ? providerServiceRecord.customWhatsIncluded
    : platformWhatsIncluded;

  const mergedWhatsNotIncluded = Array.isArray(providerServiceRecord.customWhatsNotIncluded) && providerServiceRecord.customWhatsNotIncluded.length > 0
    ? providerServiceRecord.customWhatsNotIncluded
    : platformWhatsNotIncluded;

  const mergedAddOns = Array.isArray(providerServiceRecord.customAddOns) && providerServiceRecord.customAddOns.length > 0
    ? providerServiceRecord.customAddOns
    : platformAddOns;

  const providerFaqs = Array.isArray(providerServiceRecord.customFaqs) ? providerServiceRecord.customFaqs : [];
  const mergedFaqs = [...platformFaqs, ...providerFaqs];

  const mergedPricingRules = {
    ...platformPricingRules,
    ...(providerServiceRecord.pricingRules || {}),
    basePrice: customPrice
  };

  return {
    ...srv,
    description: providerServiceRecord.customDescription || srv.description,
    whatsIncluded: mergedWhatsIncluded,
    whatsNotIncluded: mergedWhatsNotIncluded,
    customAddOns: mergedAddOns,
    faqs: mergedFaqs,
    pricingRules: mergedPricingRules,
    effectivePrice: customPrice,
    providerOverrideApplied: true
  };
}

module.exports = {
  findCanonicalService,
  mergeServiceDetails
};
