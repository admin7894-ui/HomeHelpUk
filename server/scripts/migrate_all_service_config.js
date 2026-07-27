require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');
const { SERVICE_MEDIA_CATALOG } = require('../../mobile/src/utils/serviceImages');
const { CATEGORY_IMAGES } = require('../../mobile/src/utils/categoryImages');
const { SERVICE_ALLOWED_MODELS, CATEGORY_ALLOWED_MODELS } = require('../../mobile/src/utils/pricingModelScoping');

// Hardcoded Moving Config from serviceConfig.js
const MOVING_CONFIG = {
  moveSizeOptions: [
    { id: 'single_item', title: 'Single Item', subtitle: 'Sofa, bed, appliance, or single item', priceAdjustment: 0 },
    { id: 'small_move', title: 'Small Move', subtitle: 'A few items or a small room', priceAdjustment: 15 },
    { id: 'medium_move', title: 'Medium Move', subtitle: '1–2 bedroom home', priceAdjustment: 35 },
    { id: 'large_move', title: 'Large Move', subtitle: '3+ bedroom home', priceAdjustment: 65 },
    { id: 'full_house', title: 'Full House Move', subtitle: 'Complete household relocation', priceAdjustment: 105 }
  ],
  propertySizeOptions: [
    { id: 'studio_1bed', label: 'Studio / 1 Bedroom', priceAdjustment: 0 },
    { id: '2bed', label: '2 Bedrooms', priceAdjustment: 15 },
    { id: '3bed', label: '3 Bedrooms', priceAdjustment: 30 },
    { id: '4bed_plus', label: '4+ Bedrooms', priceAdjustment: 50 }
  ],
  itemsList: [
    { id: 'sofa', name: 'Sofa', unitPrice: 10 },
    { id: 'bed', name: 'Bed & Mattress', unitPrice: 12 },
    { id: 'wardrobe', name: 'Wardrobe', unitPrice: 15 },
    { id: 'dining_table', name: 'Dining Table', unitPrice: 8 },
    { id: 'chairs', name: 'Chairs', unitPrice: 4 },
    { id: 'fridge', name: 'Fridge / Freezer', unitPrice: 15 },
    { id: 'washing_machine', name: 'Washing Machine', unitPrice: 12 },
    { id: 'tv', name: 'TV / Electronics', unitPrice: 6 },
    { id: 'boxes', name: 'Boxes & Bags', unitPrice: 3 },
    { id: 'other', name: 'Other Large Item', unitPrice: 8 }
  ],
  assistanceOptions: [
    { id: 'loading_only', label: 'Loading Only', price: 15 },
    { id: 'unloading_only', label: 'Unloading Only', price: 15 },
    { id: 'load_unload', label: 'Loading + Unloading', price: 25 },
    { id: 'packing', label: 'Packing Assistance', price: 25 },
    { id: 'disassembly', label: 'Furniture Disassembly', price: 20 },
    { id: 'assembly', label: 'Furniture Assembly', price: 20 }
  ],
  vehicleOptions: [
    { id: 'no_vehicle', title: 'No Vehicle Needed', subtitle: 'Professional labor assistance only', price: 0 },
    { id: 'small_van', title: 'Small Van', subtitle: 'Suitable for a few items / small move', price: 25 },
    { id: 'large_van', title: 'Large Van', subtitle: 'Suitable for a 1-2 bedroom move', price: 45 },
    { id: 'lorry', title: 'Lorry / Truck', subtitle: 'Suitable for a full house relocation', price: 75 }
  ]
};

// Hardcoded Cooking Family Size Config
const COOKING_CONFIG = {
  familySizeOptions: [
    { id: 'small', title: 'Small Family', peopleRange: '1–3 people', description: 'Basic meal prep', quantity: 3, enabled: true },
    { id: 'medium', title: 'Medium Family', peopleRange: '4–6 people', description: 'Standard meal prep', quantity: 5, enabled: true },
    { id: 'large', title: 'Large Family', peopleRange: '7+ people', description: 'Generous meal prep', quantity: 8, enabled: true }
  ]
};

// Category Customer Requirements
function getCategoryRequirements(catId, name) {
  if (catId === 'cat_cleaning' || name.includes('clean')) {
    return [
      { key: 'propertyType', label: 'Property Type', type: 'select', options: ['Flat', 'House', 'Bungalow', 'Commercial Office'], required: true },
      { key: 'bedrooms', label: 'Number of Bedrooms', type: 'number', required: true, defaultValue: '2' },
      { key: 'bathrooms', label: 'Number of Bathrooms', type: 'number', required: true, defaultValue: '1' },
      { key: 'dirtLevel', label: 'Property Condition', type: 'select', options: ['Light Maintenance', 'Standard Clean', 'Deep Clean Required'], required: false }
    ];
  }
  if (catId === 'cat_plumbing' || catId === 'cat_gas_services' || name.includes('plumb') || name.includes('leak') || name.includes('boiler')) {
    return [
      { key: 'issueType', label: 'Problem Description', type: 'select', options: ['Active Water Leak', 'Blocked Drain/Toilet', 'Low Pressure', 'No Hot Water/Heating', 'Fixture Installation'], required: true },
      { key: 'pipeType', label: 'Pipe / Fixture Type', type: 'select', options: ['Copper', 'Plastic (PEX)', 'Lead/Iron', 'Not Sure'], required: false },
      { key: 'stopcockKnown', label: 'Do you know where the main stopcock is?', type: 'select', options: ['Yes', 'No'], required: true }
    ];
  }
  if (catId === 'cat_moving' || name.includes('moving') || name.includes('removal')) {
    return [
      { key: 'pickupAddress', label: 'Pickup Address', type: 'address', required: true },
      { key: 'destinationAddress', label: 'Destination Address', type: 'address', required: true },
      { key: 'propertySize', label: 'Property Size', type: 'select', options: ['Single Room', 'Studio / 1 Bed', '2 Bedrooms', '3 Bedrooms', '4+ Bedrooms'], required: true }
    ];
  }
  if (catId === 'cat_childcare' || name.includes('babysitting') || name.includes('child')) {
    return [
      { key: 'numberOfChildren', label: 'Number of Children', type: 'number', required: true, defaultValue: '1' },
      { key: 'childrenAges', label: 'Children Ages', type: 'text', required: true, placeholder: 'e.g. 2 yrs, 5 yrs' },
      { key: 'bedtimeRoutine', label: 'Bedtime Routine Included?', type: 'select', options: ['Yes', 'No'], required: false }
    ];
  }
  if (catId === 'cat_pet_care' || name.includes('dog') || name.includes('pet')) {
    return [
      { key: 'numberOfPets', label: 'Number of Pets', type: 'number', required: true, defaultValue: '1' },
      { key: 'petBreed', label: 'Breed & Size', type: 'text', required: true, placeholder: 'e.g. Golden Retriever, Medium' },
      { key: 'leashBehavior', label: 'Behavior on Leash', type: 'select', options: ['Calm', 'Energetic', 'Needs Attention'], required: false }
    ];
  }
  return [];
}

// Category/Service Provider Eligibility
function getServiceEligibility(srvId, name, catId) {
  let certs = [];
  let equip = [];
  let vehicles = [];

  if (srvId.includes('boiler') || catId === 'cat_gas_services' || name.includes('gas')) {
    certs.push('GAS_SAFE_REGISTERED');
  }
  if (catId === 'cat_childcare' || catId === 'cat_care_services' || name.match(/babysitting|elderly|companion/i)) {
    certs.push('DBS_CHECKED');
  }
  if (srvId.includes('home_cook') || catId === 'cat_cooking') {
    certs.push('FOOD_HYGIENE_L2');
  }
  if (srvId.includes('moving_help') || catId === 'cat_moving') {
    vehicles = ['Small Van', 'Large Van', 'Lorry / Truck'];
    equip = ['trolley', 'straps', 'blankets'];
  }
  if (srvId.includes('carpet') || srvId.includes('sofa')) {
    equip.push('extraction_cleaner');
  }

  return {
    requiredCertifications: certs,
    requiredEquipment: equip,
    requiredVehicleTypes: vehicles,
    requiresInsurance: true
  };
}

// Service Unit Config Generator
function getUnitConfig(srv, catName) {
  const srvId = srv.id;
  const name = srv.name.toLowerCase();
  const addPrc = Number(srv.additional_charge) || 0;

  if (srvId === 'service_furniture_assembly' || name.includes('furniture assembly')) {
    return { unitLabel: 'Item', unitLabelPlural: 'Items', sectionTitle: 'Select Items to Assemble', includedQuantity: 1, additionalUnitPrice: addPrc || 15.0, minimumQuantity: 1, maximumQuantity: 10, enableQuantitySelector: true };
  }
  if (srvId === 'service_tv_mounting' || name.includes('tv mounting')) {
    return { unitLabel: 'TV', unitLabelPlural: 'TVs', sectionTitle: 'Select TVs to Mount', includedQuantity: 1, additionalUnitPrice: addPrc || 25.0, minimumQuantity: 1, maximumQuantity: 5, enableQuantitySelector: true };
  }
  if (srvId === 'service_shelf_install' || name.includes('shelf')) {
    return { unitLabel: 'Shelf', unitLabelPlural: 'Shelves', sectionTitle: 'Select Shelves to Install', includedQuantity: 2, additionalUnitPrice: addPrc || 10.0, minimumQuantity: 1, maximumQuantity: 10, enableQuantitySelector: true };
  }
  if (srvId === 'service_curtain_blind_installation' || name.includes('curtain') || name.includes('blind')) {
    return { unitLabel: 'Window', unitLabelPlural: 'Windows', sectionTitle: 'Select Windows for Curtains / Blinds', includedQuantity: 2, additionalUnitPrice: addPrc || 15.0, minimumQuantity: 1, maximumQuantity: 10, enableQuantitySelector: true };
  }
  if (srvId === 'service_picture_mirror_hanging' || name.includes('picture') || name.includes('mirror')) {
    return { unitLabel: 'Item', unitLabelPlural: 'Items', sectionTitle: 'Select Pictures / Mirrors', includedQuantity: 3, additionalUnitPrice: addPrc || 8.0, minimumQuantity: 1, maximumQuantity: 15, enableQuantitySelector: true };
  }
  if (srvId === 'service_leak_repair' || name.includes('leak')) {
    return { unitLabel: 'Leak', unitLabelPlural: 'Leaks', sectionTitle: 'Select Leaks to Repair', includedQuantity: 1, additionalUnitPrice: addPrc || 35.0, minimumQuantity: 1, maximumQuantity: 5, enableQuantitySelector: false };
  }
  if (srvId === 'service_toilet_repair' || name.includes('toilet')) {
    return { unitLabel: 'Toilet', unitLabelPlural: 'Toilets', sectionTitle: 'Select Toilets to Repair', includedQuantity: 1, additionalUnitPrice: addPrc || 30.0, minimumQuantity: 1, maximumQuantity: 5, enableQuantitySelector: true };
  }
  if (srvId === 'service_tap_install' || name.includes('tap')) {
    return { unitLabel: 'Tap', unitLabelPlural: 'Taps', sectionTitle: 'Select Taps to Install', includedQuantity: 1, additionalUnitPrice: addPrc || 25.0, minimumQuantity: 1, maximumQuantity: 5, enableQuantitySelector: true };
  }
  if (srvId === 'service_minor_plumbing_repairs' || name.includes('plumbing repair')) {
    return { unitLabel: 'Fixture', unitLabelPlural: 'Fixtures', sectionTitle: 'Select Plumbing Fixtures', includedQuantity: 1, additionalUnitPrice: addPrc || 30.0, minimumQuantity: 1, maximumQuantity: 5, enableQuantitySelector: false };
  }
  if (srvId === 'service_light_install' || name.includes('light')) {
    return { unitLabel: 'Light', unitLabelPlural: 'Lights', sectionTitle: 'Select Light Fittings', includedQuantity: 2, additionalUnitPrice: addPrc || 15.0, minimumQuantity: 1, maximumQuantity: 15, enableQuantitySelector: true };
  }
  if (srvId === 'service_cctv_install' || name.includes('cctv') || name.includes('camera')) {
    return { unitLabel: 'Camera', unitLabelPlural: 'Cameras', sectionTitle: 'Select Cameras to Install', includedQuantity: 2, additionalUnitPrice: addPrc || 35.0, minimumQuantity: 1, maximumQuantity: 8, enableQuantitySelector: true };
  }
  if (srvId === 'service_socket_install' || name.includes('socket') || name.includes('switch')) {
    return { unitLabel: 'Socket', unitLabelPlural: 'Sockets', sectionTitle: 'Select Sockets / Switches', includedQuantity: 2, additionalUnitPrice: addPrc || 12.0, minimumQuantity: 1, maximumQuantity: 20, enableQuantitySelector: true };
  }
  if (srvId === 'service_deep_cleaning' || name.includes('deep clean')) {
    return { unitLabel: 'Room', unitLabelPlural: 'Rooms', sectionTitle: 'Select Rooms', includedQuantity: 3, additionalUnitPrice: 22.0, minimumQuantity: 1, maximumQuantity: 20, enableQuantitySelector: true };
  }
  if (srvId === 'service_house_cleaning' || srvId === 'service_standard_cleaning' || name.includes('house clean') || name.includes('standard clean')) {
    return { unitLabel: 'Room', unitLabelPlural: 'Rooms', sectionTitle: 'Select Rooms', includedQuantity: 2, additionalUnitPrice: 18.0, minimumQuantity: 1, maximumQuantity: 20, enableQuantitySelector: true };
  }
  if (srvId.includes('move_in') || srvId.includes('eot') || name.includes('end of tenancy')) {
    return { unitLabel: 'Room', unitLabelPlural: 'Rooms', sectionTitle: 'Select Rooms', includedQuantity: 3, additionalUnitPrice: 30.0, minimumQuantity: 1, maximumQuantity: 20, enableQuantitySelector: true };
  }
  if (srvId.includes('oven_cleaning') || name.includes('oven')) {
    return { unitLabel: 'Appliance', unitLabelPlural: 'Appliances', sectionTitle: 'Select Oven / Appliances', includedQuantity: 1, additionalUnitPrice: 20.0, minimumQuantity: 1, maximumQuantity: 5, enableQuantitySelector: true };
  }
  if (srvId.includes('sofa') || srvId.includes('upholstery')) {
    return { unitLabel: 'Item', unitLabelPlural: 'Items', sectionTitle: 'Select Sofas / Seats', includedQuantity: 1, additionalUnitPrice: 25.0, minimumQuantity: 1, maximumQuantity: 10, enableQuantitySelector: true };
  }
  if (srvId.includes('carpet')) {
    return { unitLabel: 'Room', unitLabelPlural: 'Rooms', sectionTitle: 'Select Rooms to Clean', includedQuantity: 1, additionalUnitPrice: 25.0, minimumQuantity: 1, maximumQuantity: 15, enableQuantitySelector: true };
  }
  if (srvId.includes('window') || name.includes('window')) {
    return { unitLabel: 'Window', unitLabelPlural: 'Windows', sectionTitle: 'Select Interior Windows', includedQuantity: 4, additionalUnitPrice: 6.0, minimumQuantity: 1, maximumQuantity: 30, enableQuantitySelector: true };
  }
  if (catName === 'Cooking' || catName === 'Private Chef' || catName === 'Home Cooking') {
    return { unitLabel: 'Person', unitLabelPlural: 'People', sectionTitle: 'Select People', includedQuantity: 1, additionalUnitPrice: addPrc || 10.0, minimumQuantity: 1, maximumQuantity: 20, enableQuantitySelector: false };
  }
  if (catName === 'Pet Care' || name.match(/dog|cat|pet/i)) {
    return { unitLabel: 'Pet', unitLabelPlural: 'Pets', sectionTitle: 'Select Pets', includedQuantity: 1, additionalUnitPrice: addPrc || 10.0, minimumQuantity: 1, maximumQuantity: 10, enableQuantitySelector: true };
  }

  // Fallback
  return {
    unitLabel: srv.unit || 'Item',
    unitLabelPlural: srv.unit ? `${srv.unit}s` : 'Items',
    sectionTitle: 'Select Quantity',
    includedQuantity: 1,
    additionalUnitPrice: addPrc,
    minimumQuantity: 1,
    maximumQuantity: srv.max_quantity || 10,
    enableQuantitySelector: true
  };
}

async function runDataMigration() {
  console.log('=== PHASE 3: Migrating All Hardcoded Configurations to PostgreSQL ===');

  try {
    // 1. Deactivate the 9 removed services first
    const removedIds = [
      'service_boiler_gas_repairs', 'service_electrical_repairs', 'service_babysitting',
      'service_elderly_companion_visits', 'service_garden_waste_removal', 'service_event_catering',
      'service_moving_help', 'service_massage_wellness', 'service_pet_sitting'
    ];

    console.log(`Deactivating ${removedIds.length} hidden services in DB...`);
    await db.query(`
      UPDATE services
      SET is_active = false, is_archived = true
      WHERE id = ANY($1)
    `, [removedIds]);

    // 2. Migrate Category Images
    console.log('Migrating category cover images...');
    const catRes = await db.query('SELECT id, name FROM categories');
    for (const cat of catRes.rows) {
      const img = CATEGORY_IMAGES[cat.id] || CATEGORY_IMAGES[cat.name] || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80';
      await db.query('UPDATE categories SET image_url = $1, is_visible = true WHERE id = $2', [img, cat.id]);
    }

    // 3. Migrate Service Details (Images, Gallery, Unit Config, Scheduling, Requirements, Eligibility)
    console.log('Migrating all service configurations...');
    const srvRes = await db.query(`
      SELECT s.*, c.name as category_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
    `);

    for (const srv of srvRes.rows) {
      const srvId = srv.id;
      const catName = srv.category_name || '';

      // Media
      const media = SERVICE_MEDIA_CATALOG[srvId] || {};
      const imageUrl = media.cover || srv.image_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80';
      const galleryImages = media.gallery || srv.gallery_images || [];

      // Pricing Rules & Unit Config
      const unitConfig = getUnitConfig(srv, catName);
      const existingRules = srv.pricing_rules || {};

      let allowedModels = SERVICE_ALLOWED_MODELS[srvId] || CATEGORY_ALLOWED_MODELS[catName] || ['fixed', 'per_hour'];

      let updatedRules = {
        ...existingRules,
        unitLabel: existingRules.unitLabel || unitConfig.unitLabel,
        unitLabelPlural: existingRules.unitLabelPlural || unitConfig.unitLabelPlural,
        sectionTitle: existingRules.sectionTitle || unitConfig.sectionTitle,
        includedQuantity: existingRules.includedQuantity !== undefined ? existingRules.includedQuantity : unitConfig.includedQuantity,
        additionalUnitPrice: existingRules.additionalUnitPrice !== undefined ? existingRules.additionalUnitPrice : unitConfig.additionalUnitPrice,
        minimumQuantity: existingRules.minimumQuantity || unitConfig.minimumQuantity,
        maximumQuantity: existingRules.maximumQuantity || unitConfig.maximumQuantity,
        enableQuantitySelector: existingRules.enableQuantitySelector !== undefined ? existingRules.enableQuantitySelector : unitConfig.enableQuantitySelector,
        allowedPricingModels: allowedModels,
        pricingModel: existingRules.pricingModel || (srv.unit === 'hr' ? 'per_hour' : 'fixed')
      };

      if (srv.category_id === 'cat_moving' || srvId.includes('moving')) {
        updatedRules.movingConfig = MOVING_CONFIG;
      }
      if (srv.category_id === 'cat_cooking' || srvId.includes('cook') || catName.includes('Cook')) {
        updatedRules.cookingConfig = COOKING_CONFIG;
      }

      // Scheduling Config
      const isVariable = srv.unit === 'hr' && (srv.name.toLowerCase().includes('hourly') || srv.name.toLowerCase().includes('variable'));
      const schedulingConfig = srv.scheduling_config && srv.scheduling_config.defaultDurationHours ? srv.scheduling_config : {
        schedulingType: isVariable ? 'variable_duration' : 'fixed_duration',
        defaultDurationHours: isVariable ? 2 : (srv.duration ? (parseInt(srv.duration) || 2) : 2),
        showDurationSelectorToCustomer: isVariable,
        minDurationHours: 1,
        maxDurationHours: 8,
        durationOptions: isVariable ? [{ hours: 1, label: '1 Hour' }, { hours: 2, label: '2 Hours' }, { hours: 3, label: '3 Hours' }, { hours: 4, label: '4 Hours' }] : [],
        advanceBookingHours: 4,
        dateRequired: true,
        timeRequired: true
      };

      // Booking Rules
      const bookingRules = srv.booking_rules && srv.booking_rules.cancellationHours ? srv.booking_rules : {
        providerApprovalRequired: false,
        customerCanCancel: true,
        providerCanDecline: true,
        cancellationHours: 24,
        advanceBookingHours: 4
      };

      // Customer Requirements & Provider Eligibility
      const customerReqs = getCategoryRequirements(srv.category_id, srv.name.toLowerCase());
      const providerElig = getServiceEligibility(srvId, srv.name.toLowerCase(), srv.category_id);

      // Update Service Record
      await db.query(`
        UPDATE services
        SET image_url = $1,
            gallery_images = $2,
            pricing_rules = $3,
            scheduling_config = $4,
            booking_rules = $5,
            customer_requirements = $6,
            provider_eligibility = $7
        WHERE id = $8
      `, [
        imageUrl,
        JSON.stringify(galleryImages),
        JSON.stringify(updatedRules),
        JSON.stringify(schedulingConfig),
        JSON.stringify(bookingRules),
        JSON.stringify(customerReqs),
        JSON.stringify(providerElig),
        srvId
      ]);
    }

    console.log('✅ PHASE 3 COMPLETE: Data migration finished successfully.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ PHASE 3 FAILED:', err);
    process.exit(1);
  }
}

runDataMigration();
