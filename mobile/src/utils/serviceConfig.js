/**
 * Service Configuration Engine for HomeHelpUK
 * Determines domain-specific selection options, fields, and pricing rules based on service type.
 */

export const MOVE_SIZE_OPTIONS = [
  {
    id: 'single_item',
    title: 'Single Item',
    subtitle: 'Sofa, bed, appliance, or single item',
    icon: 'cube-outline',
    priceAdjustment: 0,
    requiresPropertySize: false,
  },
  {
    id: 'small_move',
    title: 'Small Move',
    subtitle: 'A few items or a small room',
    icon: 'couch',
    priceAdjustment: 15,
    requiresPropertySize: true,
  },
  {
    id: 'medium_move',
    title: 'Medium Move',
    subtitle: '1–2 bedroom home',
    icon: 'home-outline',
    priceAdjustment: 35,
    requiresPropertySize: true,
  },
  {
    id: 'large_move',
    title: 'Large Move',
    subtitle: '3+ bedroom home',
    icon: 'business-outline',
    priceAdjustment: 65,
    requiresPropertySize: true,
  },
  {
    id: 'full_house',
    title: 'Full House Move',
    subtitle: 'Complete household relocation',
    icon: 'bus-outline',
    priceAdjustment: 105,
    requiresPropertySize: true,
  },
];

export const PROPERTY_SIZE_OPTIONS = [
  { id: 'studio_1bed', label: 'Studio / 1 Bedroom', priceAdjustment: 0 },
  { id: '2bed', label: '2 Bedrooms', priceAdjustment: 15 },
  { id: '3bed', label: '3 Bedrooms', priceAdjustment: 30 },
  { id: '4bed_plus', label: '4+ Bedrooms', priceAdjustment: 50 },
];

export const MOVING_ITEMS_LIST = [
  { id: 'sofa', name: 'Sofa', icon: 'easel-outline', unitPrice: 10 },
  { id: 'bed', name: 'Bed & Mattress', icon: 'bed-outline', unitPrice: 12 },
  { id: 'wardrobe', name: 'Wardrobe', icon: 'albums-outline', unitPrice: 15 },
  { id: 'dining_table', name: 'Dining Table', icon: 'restaurant-outline', unitPrice: 8 },
  { id: 'chairs', name: 'Chairs', icon: 'square-outline', unitPrice: 4 },
  { id: 'fridge', name: 'Fridge / Freezer', icon: 'snow-outline', unitPrice: 15 },
  { id: 'washing_machine', name: 'Washing Machine', icon: 'aperture-outline', unitPrice: 12 },
  { id: 'tv', name: 'TV / Electronics', icon: 'tv-outline', unitPrice: 6 },
  { id: 'boxes', name: 'Boxes & Bags', icon: 'archive-outline', unitPrice: 3 },
  { id: 'other', name: 'Other Large Item', icon: 'cube-outline', unitPrice: 8 },
];

export const MOVING_ASSISTANCE_OPTIONS = [
  { id: 'loading_only', label: 'Loading Only', price: 15 },
  { id: 'unloading_only', label: 'Unloading Only', price: 15 },
  { id: 'load_unload', label: 'Loading + Unloading', price: 25 },
  { id: 'packing', label: 'Packing Assistance', price: 25 },
  { id: 'disassembly', label: 'Furniture Disassembly', price: 20 },
  { id: 'assembly', label: 'Furniture Assembly', price: 20 },
];

export const VEHICLE_OPTIONS = [
  { id: 'no_vehicle', title: 'No Vehicle Needed', subtitle: 'Professional labor assistance only', price: 0 },
  { id: 'small_van', title: 'Small Van', subtitle: 'Suitable for a few items / small move', price: 25 },
  { id: 'large_van', title: 'Large Van', subtitle: 'Suitable for a 1-2 bedroom move', price: 45 },
  { id: 'lorry', title: 'Lorry / Truck', subtitle: 'Suitable for a full house relocation', price: 75 },
];

export function getServiceType(service, mainCategory) {
  const catId = (service?.categoryId || mainCategory?.id || '').toLowerCase();
  const name = (service?.name || mainCategory?.name || '').toLowerCase();
  const srvId = (service?.id || '').toLowerCase();

  if (
    catId === 'cat_moving' ||
    srvId.includes('moving') ||
    srvId.includes('removal') ||
    srvId.includes('man_van') ||
    name.match(/moving|removal|man & van|relocation|furniture transport/i)
  ) {
    return 'MOVING';
  }

  if (
    catId === 'cat_cooking' ||
    srvId.includes('cooking') ||
    srvId.includes('chef') ||
    name.match(/chef|cook|meal prep|baking|catering/i)
  ) {
    return 'COOKING';
  }

  if (
    catId === 'cat_cleaning' ||
    srvId.includes('cleaning') ||
    name.match(/clean|sanit|housekeeping/i)
  ) {
    return 'CLEANING';
  }

  return 'GENERIC';
}

export function resolveUnitConfig(service, mainCategory) {
  if (service?.unitConfig) {
    return service.unitConfig;
  }

  const pricingRules = service?.pricingRules || {};
  if (pricingRules.unitLabel) {
    return {
      unitLabel: pricingRules.unitLabel,
      unitLabelPlural: pricingRules.unitLabelPlural || `${pricingRules.unitLabel}s`,
      sectionTitle: pricingRules.sectionTitle || `Select ${pricingRules.unitLabelPlural || 'Quantity'}`,
      includedQty: Number(pricingRules.includedQuantity ?? 1),
      extraUnitPrice: Number(pricingRules.additionalUnitPrice ?? 0),
      minQty: Number(pricingRules.minimumQuantity ?? 1),
      maxQty: Number(pricingRules.maximumQuantity ?? 20),
      enabled: pricingRules.enableQuantitySelector !== false
    };
  }

  const srvId = (service?.id || '').toLowerCase();
  const name = (service?.name || '').toLowerCase();
  const catId = (service?.categoryId || mainCategory?.id || '').toLowerCase();
  const catName = (mainCategory?.name || '').toLowerCase();
  const unit = (service?.unit || '').toLowerCase();
  const baseIncludes = (service?.baseIncludes || '').toLowerCase();

  const incQty = Number(pricingRules.includedQuantity ?? service?.includedQty ?? (pricingRules.includedHours || 1));
  const addPrc = Number(pricingRules.additionalUnitPrice ?? pricingRules.additionalHourPrice ?? service?.additionalCharge ?? 0);
  const minQ = Number(pricingRules.minimumQuantity || 1);
  const maxQ = Number(service?.maxQuantity ?? pricingRules.maximumQuantity ?? 20);

  // Explicit Confirmed Service Overrides (London / Canary Wharf 2026 Calibrated)
  // --- Handyman & Assembly Services ---
  if (srvId === 'service_furniture_assembly' || name.includes('furniture assembly')) {
    return {
      unitLabel: 'Item',
      unitLabelPlural: 'Items',
      sectionTitle: 'Select Items to Assemble',
      includedQty: 1,
      extraUnitPrice: addPrc || 15.0,
      minQty: 1,
      maxQty: 10,
    };
  }

  if (srvId === 'service_tv_mounting' || name.includes('tv mounting')) {
    return {
      unitLabel: 'TV',
      unitLabelPlural: 'TVs',
      sectionTitle: 'Select TVs to Mount',
      includedQty: 1,
      extraUnitPrice: addPrc || 25.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  if (srvId === 'service_shelf_install' || name.includes('shelf')) {
    return {
      unitLabel: 'Shelf',
      unitLabelPlural: 'Shelves',
      sectionTitle: 'Select Shelves to Install',
      includedQty: 2,
      extraUnitPrice: addPrc || 10.0,
      minQty: 1,
      maxQty: 10,
    };
  }

  if (srvId === 'service_curtain_blind_installation' || name.includes('curtain') || name.includes('blind')) {
    return {
      unitLabel: 'Window',
      unitLabelPlural: 'Windows',
      sectionTitle: 'Select Windows for Curtains / Blinds',
      includedQty: 2,
      extraUnitPrice: addPrc || 15.0,
      minQty: 1,
      maxQty: 10,
    };
  }

  if (srvId === 'service_picture_mirror_hanging' || name.includes('picture') || name.includes('mirror')) {
    return {
      unitLabel: 'Item',
      unitLabelPlural: 'Items',
      sectionTitle: 'Select Pictures / Mirrors',
      includedQty: 3,
      extraUnitPrice: addPrc || 8.0,
      minQty: 1,
      maxQty: 15,
    };
  }

  // --- Plumbing Services ---
  if (srvId === 'service_leak_repair' || name.includes('leak')) {
    return {
      unitLabel: 'Leak',
      unitLabelPlural: 'Leaks',
      sectionTitle: 'Select Leaks to Repair',
      includedQty: 1,
      extraUnitPrice: addPrc || 35.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  if (srvId === 'service_toilet_repair' || name.includes('toilet')) {
    return {
      unitLabel: 'Toilet',
      unitLabelPlural: 'Toilets',
      sectionTitle: 'Select Toilets to Repair',
      includedQty: 1,
      extraUnitPrice: addPrc || 30.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  if (srvId === 'service_tap_install' || name.includes('tap')) {
    return {
      unitLabel: 'Tap',
      unitLabelPlural: 'Taps',
      sectionTitle: 'Select Taps to Install',
      includedQty: 1,
      extraUnitPrice: addPrc || 25.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  if (srvId === 'service_minor_plumbing_repairs' || name.includes('plumbing repair')) {
    return {
      unitLabel: 'Fixture',
      unitLabelPlural: 'Fixtures',
      sectionTitle: 'Select Plumbing Fixtures',
      includedQty: 1,
      extraUnitPrice: addPrc || 30.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  // --- Electrical Services ---
  if (srvId === 'service_light_install' || name.includes('light')) {
    return {
      unitLabel: 'Light',
      unitLabelPlural: 'Lights',
      sectionTitle: 'Select Light Fittings',
      includedQty: 2,
      extraUnitPrice: addPrc || 15.0,
      minQty: 1,
      maxQty: 15,
    };
  }

  if (srvId === 'service_cctv_install' || name.includes('cctv') || name.includes('camera')) {
    return {
      unitLabel: 'Camera',
      unitLabelPlural: 'Cameras',
      sectionTitle: 'Select Cameras to Install',
      includedQty: 2,
      extraUnitPrice: addPrc || 35.0,
      minQty: 1,
      maxQty: 8,
    };
  }

  if (srvId === 'service_socket_install' || name.includes('socket') || name.includes('switch')) {
    return {
      unitLabel: 'Socket',
      unitLabelPlural: 'Sockets',
      sectionTitle: 'Select Sockets / Switches',
      includedQty: 2,
      extraUnitPrice: addPrc || 12.0,
      minQty: 1,
      maxQty: 20,
    };
  }

  // --- Cleaning Services ---
  if (srvId === 'service_deep_cleaning' || name.includes('deep clean')) {
    return {
      unitLabel: 'Room',
      unitLabelPlural: 'Rooms',
      sectionTitle: 'Select Rooms',
      includedQty: 3,
      extraUnitPrice: 22.0,
      minQty: 1,
      maxQty: 20,
    };
  }

  if (srvId === 'service_house_cleaning' || srvId === 'service_standard_cleaning' || name.includes('house clean') || name.includes('standard clean') || name.includes('home clean')) {
    return {
      unitLabel: 'Room',
      unitLabelPlural: 'Rooms',
      sectionTitle: 'Select Rooms',
      includedQty: 2,
      extraUnitPrice: 18.0,
      minQty: 1,
      maxQty: 20,
    };
  }

  if (srvId.includes('move_in') || srvId.includes('eot') || name.includes('end of tenancy')) {
    return {
      unitLabel: 'Room',
      unitLabelPlural: 'Rooms',
      sectionTitle: 'Select Rooms',
      includedQty: 3,
      extraUnitPrice: 30.0,
      minQty: 1,
      maxQty: 20,
    };
  }

  if (srvId.includes('oven_cleaning') || name.includes('oven')) {
    return {
      unitLabel: 'Appliance',
      unitLabelPlural: 'Appliances',
      sectionTitle: 'Select Oven / Appliances',
      includedQty: 1,
      extraUnitPrice: 20.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  if (srvId.includes('sofa') || srvId.includes('upholstery')) {
    return {
      unitLabel: 'Item',
      unitLabelPlural: 'Items',
      sectionTitle: 'Select Sofas / Seats',
      includedQty: 1,
      extraUnitPrice: 25.0,
      minQty: 1,
      maxQty: 10,
    };
  }

  if (srvId.includes('carpet')) {
    return {
      unitLabel: 'Room',
      unitLabelPlural: 'Rooms',
      sectionTitle: 'Select Rooms to Clean',
      includedQty: 1,
      extraUnitPrice: 25.0,
      minQty: 1,
      maxQty: 15,
    };
  }

  if (srvId.includes('window') || name.includes('window')) {
    return {
      unitLabel: 'Window',
      unitLabelPlural: 'Windows',
      sectionTitle: 'Select Interior Windows',
      includedQty: 4,
      extraUnitPrice: 6.0,
      minQty: 1,
      maxQty: 30,
    };
  }

  // --- Painting Services ---
  if (srvId === 'service_interior_paint' || name.includes('paint')) {
    return {
      unitLabel: 'Room',
      unitLabelPlural: 'Rooms',
      sectionTitle: 'Select Rooms to Paint',
      includedQty: 1,
      extraUnitPrice: addPrc || 80.0,
      minQty: 1,
      maxQty: 10,
    };
  }

  if (srvId === 'service_wallpaper' || name.includes('wallpaper')) {
    return {
      unitLabel: 'Wall',
      unitLabelPlural: 'Walls',
      sectionTitle: 'Select Walls for Wallpaper',
      includedQty: 1,
      extraUnitPrice: addPrc || 45.0,
      minQty: 1,
      maxQty: 10,
    };
  }

  // --- Gardening Services ---
  if (srvId === 'service_lawn_mowing' || name.includes('lawn')) {
    return {
      unitLabel: 'Lawn',
      unitLabelPlural: 'Lawns',
      sectionTitle: 'Select Lawns',
      includedQty: 1,
      extraUnitPrice: addPrc || 15.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  if (srvId === 'service_hedge_trim' || name.includes('hedge')) {
    return {
      unitLabel: 'Hedge',
      unitLabelPlural: 'Hedges',
      sectionTitle: 'Select Hedges',
      includedQty: 1,
      extraUnitPrice: addPrc || 20.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  if (srvId === 'service_garden_clean' || srvId === 'service_garden_maintenance' || name.includes('garden')) {
    return {
      unitLabel: 'Garden Area',
      unitLabelPlural: 'Garden Areas',
      sectionTitle: 'Select Garden Areas',
      includedQty: 1,
      extraUnitPrice: addPrc || 25.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  // --- Laundry Services ---
  if (srvId === 'service_ironing' || name.includes('ironing')) {
    return {
      unitLabel: 'Item',
      unitLabelPlural: 'Items',
      sectionTitle: 'Select Clothes / Items to Iron',
      includedQty: 10,
      extraUnitPrice: addPrc || 1.5,
      minQty: 5,
      maxQty: 50,
    };
  }

  if (srvId === 'service_laundry_pickup_delivery' || name.includes('laundry')) {
    return {
      unitLabel: 'Bag',
      unitLabelPlural: 'Bags',
      sectionTitle: 'Select Laundry Bags',
      includedQty: 1,
      extraUnitPrice: addPrc || 12.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  // --- Appliance Installation ---
  if (srvId === 'service_appliance_installation_non_gas' || name.includes('appliance')) {
    return {
      unitLabel: 'Appliance',
      unitLabelPlural: 'Appliances',
      sectionTitle: 'Select Appliances to Install',
      includedQty: 1,
      extraUnitPrice: addPrc || 35.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  // --- Vehicle Care / Car Wash ---
  if (srvId.includes('car_wash') || catId === 'cat_vehicle_care' || name.includes('car wash') || name.includes('vehicle')) {
    return {
      unitLabel: 'Car',
      unitLabelPlural: 'Cars',
      sectionTitle: 'Select Cars to Wash',
      includedQty: 1,
      extraUnitPrice: addPrc || 20.0,
      minQty: 1,
      maxQty: 5,
    };
  }

  // --- Moving & Packing ---
  if (srvId.includes('packing') || catId === 'cat_moving' || name.includes('packing')) {
    return {
      unitLabel: 'Room',
      unitLabelPlural: 'Rooms',
      sectionTitle: 'Select Rooms to Pack / Unpack',
      includedQty: 1,
      extraUnitPrice: addPrc || 25.0,
      minQty: 1,
      maxQty: 10,
    };
  }

  // --- Home Services ---
  if (srvId.includes('home_organization') || name.includes('organization')) {
    return {
      unitLabel: 'Room',
      unitLabelPlural: 'Rooms',
      sectionTitle: 'Select Rooms to Organize',
      includedQty: 1,
      extraUnitPrice: addPrc || 25.0,
      minQty: 1,
      maxQty: 10,
    };
  }

  if (srvId.includes('home_check') || name.includes('home check')) {
    return {
      unitLabel: 'Visit',
      unitLabelPlural: 'Visits',
      sectionTitle: 'Select Check Visits',
      includedQty: 1,
      extraUnitPrice: addPrc || 15.0,
      minQty: 1,
      maxQty: 14,
    };
  }

  if (srvId.includes('plant_watering') || name.includes('plant')) {
    return {
      unitLabel: 'Visit',
      unitLabelPlural: 'Visits',
      sectionTitle: 'Select Plant Care Visits',
      includedQty: 1,
      extraUnitPrice: addPrc || 10.0,
      minQty: 1,
      maxQty: 14,
    };
  }

  // --- Per Person / Beauty & Cooking ---
  if (
    catId === 'cat_cooking' ||
    catId === 'cat_beauty' ||
    pricingRules.pricingModel === 'per_person' ||
    baseIncludes.match(/person|people|guest|diner/) ||
    name.match(/cook|chef|makeup|massage|hair|beauty|facial|waxing|threading|manicure|pedicure|catering/i)
  ) {
    return {
      unitLabel: 'Person',
      unitLabelPlural: 'People',
      sectionTitle: 'Select People',
      includedQty: incQty || 1,
      extraUnitPrice: addPrc || 10.0,
      minQty: minQ || 1,
      maxQty: maxQ || 20,
    };
  }

  // --- Pets & Animals ---
  if (catId === 'cat_pets' || name.match(/dog|cat|pet/i)) {
    return {
      unitLabel: 'Pet',
      unitLabelPlural: 'Pets',
      sectionTitle: 'Select Pets',
      includedQty: incQty || 1,
      extraUnitPrice: addPrc || 10.0,
      minQty: minQ || 1,
      maxQty: maxQ || 10,
    };
  }

  // --- Genuinely Variable Hourly Services ---
  if (
    pricingRules.pricingModel === 'per_hour_variable' ||
    name.includes('hourly') ||
    name.includes('variable duration')
  ) {
    return {
      unitLabel: 'Hour',
      unitLabelPlural: 'Hours',
      sectionTitle: 'Select Duration / Hours',
      includedQty: incQty || 1,
      extraUnitPrice: addPrc || Number(service?.price || 35),
      minQty: minQ || 1,
      maxQty: Math.min(maxQ, 8),
    };
  }

  // Fallback: If extra charge is per item/job
  return {
    unitLabel: 'Item',
    unitLabelPlural: 'Items',
    sectionTitle: 'Select Quantity',
    includedQty: incQty || 1,
    extraUnitPrice: addPrc || 0,
    minQty: minQ || 1,
    maxQty: maxQ || 10,
  };
}

export function getSchedulingConfig(service, mainCategory) {
  if (service?.schedulingConfig && service.schedulingConfig.defaultDurationHours) {
    const sc = service.schedulingConfig;
    return {
      schedulingType: sc.schedulingType || 'fixed_duration',
      showDurationSelector: Boolean(sc.showDurationSelectorToCustomer),
      defaultDurationHours: Number(sc.defaultDurationHours || 2),
      durationOptions: Array.isArray(sc.durationOptions) ? sc.durationOptions : [],
    };
  }

  const srvId = (service?.id || '').toLowerCase();
  const name = (service?.name || '').toLowerCase();
  const unit = (service?.unit || '').toLowerCase();
  const pricingRules = service?.pricingRules || {};

  const isVariableDuration = (
    unit === 'hr' &&
    (name.includes('hourly') || name.includes('variable') || pricingRules.pricingModel === 'per_hour_variable')
  );

  if (isVariableDuration) {
    return {
      schedulingType: 'variable_duration',
      showDurationSelector: true,
      defaultDurationHours: 2,
      durationOptions: [
        { hours: 1, label: '1 Hour' },
        { hours: 2, label: '2 Hours' },
        { hours: 3, label: '3 Hours' },
        { hours: 4, label: '4 Hours' },
      ],
    };
  }

  if (srvId === 'service_deep_cleaning' || name.includes('deep clean')) {
    return {
      schedulingType: 'fixed_duration',
      showDurationSelector: false,
      defaultDurationHours: 3,
      durationOptions: [],
    };
  }

  // Predefined / Fixed duration services (Cleaning, Cooking, Leak Repair, Appliance Repair, etc.)
  const defaultDuration = Number(pricingRules.includedHours || service?.durationHours || (unit === 'hr' ? 1 : 2));

  return {
    schedulingType: 'fixed_duration',
    showDurationSelector: false,
    defaultDurationHours: defaultDuration,
    durationOptions: [],
  };
}

export function getServiceConfig(serviceId, service = {}, mainCategory = {}) {
  const srvId = (serviceId || service?.id || '').toLowerCase();
  const name = (service?.name || mainCategory?.name || '').toLowerCase();
  const catId = (service?.categoryId || mainCategory?.id || '').toLowerCase();
  const catName = (mainCategory?.name || '').toLowerCase();

  const quantityConfig = resolveUnitConfig(service, mainCategory);
  const schedulingConfig = getSchedulingConfig(service, mainCategory);

  // Disable quantity selector for services that don't need it
  const isNoQuantityService = (
    srvId.includes('leak_repair') ||
    srvId.includes('boiler_gas') ||
    srvId.includes('electrical_repairs') ||
    srvId.includes('minor_plumbing') ||
    srvId.includes('moving_help') ||
    catId === 'cat_cooking' ||
    srvId.includes('home_cook')
  );

  const finalQuantityConfig = {
    ...quantityConfig,
    enabled: !isNoQuantityService,
  };

  // Customer Requirements & Form Fields based on Category/Service
  let customerRequirements = (Array.isArray(service?.customerRequirements) && service.customerRequirements.length > 0)
    ? service.customerRequirements
    : [];

  let conditionalRequirements = [];

  if (customerRequirements.length === 0) {
    if (catId === 'cat_cleaning' || name.includes('clean')) {
      customerRequirements = [
        { key: 'propertyType', label: 'Property Type', type: 'select', options: ['Flat', 'House', 'Bungalow', 'Commercial Office'], required: true },
        { key: 'bedrooms', label: 'Number of Bedrooms', type: 'number', required: true, defaultValue: '2' },
        { key: 'bathrooms', label: 'Number of Bathrooms', type: 'number', required: true, defaultValue: '1' },
        { key: 'dirtLevel', label: 'Property Condition', type: 'select', options: ['Light Maintenance', 'Standard Clean', 'Deep Clean Required'], required: false },
      ];
    } else if (catId === 'cat_plumbing' || catId === 'cat_gas_services' || name.includes('plumb') || name.includes('leak') || name.includes('boiler')) {
      customerRequirements = [
        { key: 'issueType', label: 'Problem Description', type: 'select', options: ['Active Water Leak', 'Blocked Drain/Toilet', 'Low Pressure', 'No Hot Water/Heating', 'Fixture Installation'], required: true },
        { key: 'pipeType', label: 'Pipe / Fixture Type', type: 'select', options: ['Copper', 'Plastic (PEX)', 'Lead/Iron', 'Not Sure'], required: false },
        { key: 'stopcockKnown', label: 'Do you know where the main stopcock is?', type: 'select', options: ['Yes', 'No'], required: true },
      ];
    }
  }

  // Provider Requirements Matrix
  const pElig = service?.providerEligibility || {};
  let requiredCertifications = pElig.requiredCertifications || [];
  let requiredEquipment = pElig.requiredEquipment || [];
  let requiredVehicleTypes = pElig.requiredVehicleTypes || [];

  if (requiredCertifications.length === 0 && requiredEquipment.length === 0 && requiredVehicleTypes.length === 0) {
    if (srvId.includes('boiler') || catId === 'cat_gas_services' || name.includes('gas')) {
      requiredCertifications.push('GAS_SAFE_REGISTERED');
    }
    if (catId === 'cat_childcare' || catId === 'cat_care_services' || name.match(/babysitting|elderly|companion/i)) {
      requiredCertifications.push('DBS_CHECKED');
    }
  }

  const isDeactivatedService = (
    service?.isActive === false || service?.isArchived === true
  );

  return {
    serviceId: srvId,
    serviceName: service?.name || mainCategory?.name || 'Service',
    categoryId: catId,
    isActive: !isDeactivatedService,
    isBookable: !isDeactivatedService,
    isVisible: !isDeactivatedService,
    legalRiskLevel: isDeactivatedService ? 'VERY_HIGH' : (srvId.includes('leak') ? 'MEDIUM' : 'LOW'),
    allowedScope: ['Standard domestic scope', 'Like-for-like fitting replacement', 'Interior glass cleaning'],
    excludedScope: ['Gas work', 'Boiler work', 'High-voltage mains rewiring', 'Exterior high-rise window cleaning'],
    quantityConfig: finalQuantityConfig,
    durationConfig: {
      type: schedulingConfig.showDurationSelector ? 'variable' : 'fixed',
      defaultDurationHours: schedulingConfig.defaultDurationHours,
      minDurationHours: 1,
      maxDurationHours: 8,
      showDurationSelectorToCustomer: schedulingConfig.showDurationSelector,
      durationDisplayText: `Expected duration: ${schedulingConfig.defaultDurationHours} Hours`,
      bookingBufferHours: 1,
    },
    schedulingConfig: {
      type: 'time_slot',
      dateRequired: true,
      timeRequired: true,
      advanceBookingHours: 4,
    },
    customerRequirements,
    conditionalRequirements,
    pricingConfig: {
      type: service?.pricingRules?.pricingModel || 'fixed',
      basePrice: Number(service?.price || 45),
      includedQuantity: finalQuantityConfig.includedQty,
      extraUnitPrice: finalQuantityConfig.extraUnitPrice,
    },
    providerRequirements: {
      requiredServiceId: service?.id || srvId,
      requiredCategoryId: catId,
      requiredCertifications,
      requiredEquipment,
      requiredVehicleTypes,
      requiresInsurance: true,
      serviceAreaRequired: true,
    },
    bookingRules: {
      providerApprovalRequired: false,
      customerCanCancel: true,
      providerCanDecline: true,
      cancellationHours: 24,
    },
  };
}
