/**
 * Pricing Model Scoping Engine for HomeHelpUK (Mobile)
 * Defines applicable pricing models per Category and per Service.
 */

export const PRICING_MODELS = {
  fixed: { id: 'fixed', label: 'Fixed Price', unit: 'visit' },
  per_hour: { id: 'per_hour', label: 'Per Hour', unit: 'hour' },
  per_person: { id: 'per_person', label: 'Per Person', unit: 'person' },
  per_child: { id: 'per_child', label: 'Per Child', unit: 'child' },
  per_pet: { id: 'per_pet', label: 'Per Pet', unit: 'pet' },
  per_room: { id: 'per_room', label: 'Per Room', unit: 'room' },
  per_window: { id: 'per_window', label: 'Per Window', unit: 'window' },
  per_item: { id: 'per_item', label: 'Per Item / Fixture', unit: 'item' },
  per_unit: { id: 'per_unit', label: 'Per Unit / Section', unit: 'unit' },
  quote: { id: 'quote', label: 'Diagnostic / Quote', unit: 'hour' }
};

export const CATEGORY_ALLOWED_MODELS = {
  Cooking: ['fixed', 'per_hour', 'per_person'],
  Cleaning: ['fixed', 'per_hour', 'per_room', 'per_window', 'per_item', 'per_unit'],
  Plumbing: ['fixed', 'per_hour', 'per_item', 'quote'],
  Electrical: ['fixed', 'per_hour', 'per_item', 'quote'],
  Handyman: ['fixed', 'per_hour', 'per_item', 'per_window'],
  Painting: ['fixed', 'per_room', 'per_item'],
  Gardening: ['fixed', 'per_hour', 'per_unit', 'per_item'],
  Laundry: ['fixed', 'per_hour', 'per_item'],
  Moving: ['fixed', 'per_hour', 'per_item'],
  'Home Services': ['fixed', 'per_hour'],
  'Pet Care': ['fixed', 'per_pet', 'per_hour'],
  'Vehicle Care': ['fixed', 'per_item'],
  Beauty: ['fixed', 'per_person'],
  Appliance: ['fixed', 'per_item'],
  'Gas Services': ['fixed', 'per_hour', 'quote'],
  Childcare: ['fixed', 'per_child', 'per_hour'],
  'Care Services': ['fixed', 'per_person', 'per_hour']
};

export const SERVICE_ALLOWED_MODELS = {
  // Plumbing
  service_leak_repair: ['fixed', 'per_hour', 'quote'],
  service_toilet_repair: ['fixed', 'per_item'],
  service_tap_install: ['fixed', 'per_item'],
  service_minor_plumbing_repairs: ['fixed', 'per_hour', 'quote'],

  // Electrical
  service_light_install: ['fixed', 'per_item'],
  service_cctv_install: ['fixed', 'per_item'],
  service_socket_install: ['fixed', 'per_item'],
  service_electrical_repairs: ['fixed', 'per_hour', 'quote'],

  // Beauty Specificity
  service_haircut_home_service: ['fixed'],
  service_hair_styling: ['fixed'],
  service_facial: ['fixed'],
  service_waxing: ['fixed'],
  service_threading: ['fixed'],
  service_manicure: ['fixed'],
  service_pedicure: ['fixed'],
  service_massage_wellness: ['fixed'],
  service_makeup_party: ['fixed', 'per_person'],
  service_bridal_makeup: ['fixed', 'per_person'],

  // Cooking Specificity
  service_baby_food_prep: ['fixed'],
  service_baking: ['fixed']
};

export function getApplicablePricingModels(serviceId, categoryName) {
  if (serviceId && SERVICE_ALLOWED_MODELS[serviceId]) {
    return SERVICE_ALLOWED_MODELS[serviceId].map(id => PRICING_MODELS[id]).filter(Boolean);
  }

  if (categoryName && CATEGORY_ALLOWED_MODELS[categoryName]) {
    return CATEGORY_ALLOWED_MODELS[categoryName].map(id => PRICING_MODELS[id]).filter(Boolean);
  }

  return [PRICING_MODELS.fixed, PRICING_MODELS.per_hour];
}

export function isPricingModelAllowed(serviceId, categoryName, pricingModelId) {
  const allowed = getApplicablePricingModels(serviceId, categoryName);
  return allowed.some(m => m.id === pricingModelId);
}
