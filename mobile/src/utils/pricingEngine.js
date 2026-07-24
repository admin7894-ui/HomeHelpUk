/**
 * Universal Pricing Engine for HomeHelpUK
 * Calculates service pricing based on shared base price, multi-component rules (duration & quantity), add-ons, and platform fee.
 */

export function calculateServicePrice({
  basePrice = 0,
  selectedAddons = [],
  quantity = 1,
  durationHours = 1,
  serviceUnit = 'visit',
  pricingRules = {}
}) {
  const model = pricingRules.pricingModel || (serviceUnit === 'hr' ? 'per_hour' : 'fixed');
  const baseRate = Number(basePrice) || Number(pricingRules.basePrice) || 0;
  
  // 1. Time Component (Extra Hours beyond Included Hours)
  const isHourlyEnabled = Boolean(
    pricingRules.enablePerHour || 
    (Array.isArray(pricingRules.enabledModels) && pricingRules.enabledModels.includes('per_hour')) ||
    model === 'per_hour' || 
    model === 'multi' ||
    serviceUnit === 'hr'
  );
  
  const includedHours = Number(pricingRules.includedHours) || 1;
  const extraHourPrice = Number(pricingRules.additionalHourPrice) || (isHourlyEnabled ? (Number(pricingRules.additionalUnitPrice) || baseRate) : 0);
  const hours = isHourlyEnabled ? Math.max(1, Number(durationHours) || 1) : 1;
  
  let extraHours = 0;
  let extraHoursCost = 0;
  if (isHourlyEnabled && hours > includedHours && extraHourPrice > 0) {
    extraHours = hours - includedHours;
    extraHoursCost = extraHours * extraHourPrice;
  }

  // 2. Quantity Component (Extra Persons/Units beyond Included Quantity)
  const isUnitEnabled = Boolean(
    pricingRules.enablePerUnit || 
    (Array.isArray(pricingRules.enabledModels) && pricingRules.enabledModels.some(m => m !== 'fixed' && m !== 'per_hour')) ||
    model === 'per_person' || 
    model === 'per_unit' ||
    model === 'per_room' ||
    model === 'per_window' ||
    model === 'per_item' ||
    model === 'per_pet' ||
    model === 'per_child' ||
    model === 'multi'
  );

  const includedQty = Number(pricingRules.includedQuantity) || 4;
  const extraUnitPrice = isUnitEnabled ? (Number(pricingRules.additionalUnitPrice) || 0) : 0;
  const qty = Math.max(1, Number(quantity) || 1);

  let extraUnits = 0;
  let extraUnitsCost = 0;

  if (isUnitEnabled && qty > includedQty && extraUnitPrice > 0) {
    extraUnits = qty - includedQty;
    extraUnitsCost = extraUnits * extraUnitPrice;
  }

  // 3. Add-on cost
  let addonsCost = 0;
  if (Array.isArray(selectedAddons)) {
    addonsCost = selectedAddons.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }

  // 4. Subtotal, Platform Fee (11%), Grand Total
  const subtotal = Math.round((baseRate + extraHoursCost + extraUnitsCost + addonsCost) * 100) / 100;
  const platformFee = Math.round(subtotal * 0.11 * 100) / 100;
  const grandTotal = Math.round((subtotal + platformFee) * 100) / 100;

  return {
    pricingModel: model,
    basePrice: baseRate,
    durationHours: isHourlyEnabled ? hours : 0,
    includedHours: isHourlyEnabled ? includedHours : 0,
    extraHours,
    extraHourPrice,
    extraHoursCost,
    includedQuantity: includedQty,
    includedUnit: pricingRules.includedUnit || 'unit',
    selectedQuantity: qty,
    extraUnits,
    additionalUnitPrice: extraUnitPrice,
    extraUnitsCost,
    addonsCost,
    subtotal,
    platformFee,
    grandTotal,
    totalCost: grandTotal
  };
}

export function formatUnitLabel(unit = 'unit', qty = 1) {
  const clean = String(unit).toLowerCase().trim();
  const plural = qty === 1 ? clean : (clean.endsWith('s') || clean.endsWith('ch') ? `${clean}es` : `${clean}s`);
  return `${qty} ${plural}`;
}

export function formatPriceUnit(unit) {
  switch (String(unit).toLowerCase()) {
    case 'hr':
    case 'hour':
      return '/hr';
    case 'visit':
      return '/visit';
    case 'event':
      return '/event';
    case 'order':
      return '/order';
    case 'item':
      return '/item';
    case 'room':
      return '/room';
    case 'person':
      return '/person';
    case 'window':
      return '/window';
    default:
      return ' fixed';
  }
}
