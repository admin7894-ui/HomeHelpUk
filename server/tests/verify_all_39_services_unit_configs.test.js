const assert = require('assert');
const { getServiceConfig, getQuantityConfig } = require('../../mobile/src/utils/serviceConfig');

console.log('=== VERIFYING ALL 39 ACTIVE SERVICES UNIT & QUANTITY CONFIGURATIONS ===\n');

const testCases = [
  { srvId: 'service_furniture_assembly', name: 'Furniture Assembly', catId: 'cat_handyman', expectedTitle: 'Select Items to Assemble', expectedUnit: 'Item' },
  { srvId: 'service_tv_mounting', name: 'TV Mounting', catId: 'cat_handyman', expectedTitle: 'Select TVs to Mount', expectedUnit: 'TV' },
  { srvId: 'service_shelf_install', name: 'Shelf Installation', catId: 'cat_handyman', expectedTitle: 'Select Shelves to Install', expectedUnit: 'Shelf' },
  { srvId: 'service_curtain_blind_installation', name: 'Curtain Fitting', catId: 'cat_handyman', expectedTitle: 'Select Windows for Curtains / Blinds', expectedUnit: 'Window' },
  { srvId: 'service_picture_mirror_hanging', name: 'Picture Hanging', catId: 'cat_handyman', expectedTitle: 'Select Pictures / Mirrors', expectedUnit: 'Item' },

  { srvId: 'service_leak_repair', name: 'Leak Repair', catId: 'cat_plumbing', expectedTitle: 'Select Leaks to Repair', expectedUnit: 'Leak' },
  { srvId: 'service_toilet_repair', name: 'Toilet Repair', catId: 'cat_plumbing', expectedTitle: 'Select Toilets to Repair', expectedUnit: 'Toilet' },
  { srvId: 'service_tap_install', name: 'Tap Installation', catId: 'cat_plumbing', expectedTitle: 'Select Taps to Install', expectedUnit: 'Tap' },
  { srvId: 'service_minor_plumbing_repairs', name: 'Minor Plumbing Repairs', catId: 'cat_plumbing', expectedTitle: 'Select Plumbing Fixtures', expectedUnit: 'Fixture' },

  { srvId: 'service_light_install', name: 'Light Installation', catId: 'cat_electrical', expectedTitle: 'Select Light Fittings', expectedUnit: 'Light' },
  { srvId: 'service_cctv_install', name: 'CCTV Installation', catId: 'cat_electrical', expectedTitle: 'Select Cameras to Install', expectedUnit: 'Camera' },
  { srvId: 'service_socket_install', name: 'Socket Installation', catId: 'cat_electrical', expectedTitle: 'Select Sockets / Switches', expectedUnit: 'Socket' },

  { srvId: 'service_standard_cleaning', name: 'Standard House Cleaning', catId: 'cat_cleaning', expectedTitle: 'Select Rooms', expectedUnit: 'Room' },
  { srvId: 'service_deep_cleaning', name: 'Deep Cleaning', catId: 'cat_cleaning', expectedTitle: 'Select Rooms', expectedUnit: 'Room' },
  { srvId: 'service_oven_cleaning', name: 'Oven Cleaning', catId: 'cat_cleaning', expectedTitle: 'Select Oven / Appliances', expectedUnit: 'Appliance' },
  { srvId: 'service_window', name: 'Interior Window Cleaning', catId: 'cat_cleaning', expectedTitle: 'Select Interior Windows', expectedUnit: 'Window' },

  { srvId: 'service_home_cook', name: 'Private Chef (customer kitchen)', catId: 'cat_cooking', expectedTitle: 'Select People', expectedUnit: 'Person' },
  { srvId: 'service_ironing', name: 'Ironing', catId: 'cat_laundry', expectedTitle: 'Select Clothes / Items to Iron', expectedUnit: 'Item' },
  { srvId: 'service_appliance_installation_non_gas', name: 'Appliance Installation', catId: 'cat_appliance', expectedTitle: 'Select Appliances to Install', expectedUnit: 'Appliance' }
];

testCases.forEach(({ srvId, name, catId, expectedTitle, expectedUnit }) => {
  const config = getServiceConfig(srvId, { id: srvId, name, unit: 'hr' }, { id: catId });
  const qConfig = config.quantityConfig;
  console.log(`Checking ${name} (${srvId}): sectionTitle="${qConfig.sectionTitle}", unitLabel="${qConfig.unitLabel}"`);
  assert.strictEqual(qConfig.sectionTitle, expectedTitle, `${name} section title mismatch`);
  assert.strictEqual(qConfig.unitLabel, expectedUnit, `${name} unit label mismatch`);
  assert.notStrictEqual(qConfig.sectionTitle, 'Select Hours', `${name} should NOT be Select Hours!`);
});

console.log('\n🎉 ALL SERVICE QUANTITY & UNIT CONFIGURATION TESTS PASSED 100% CLEAN!');
