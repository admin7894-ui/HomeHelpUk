const assert = require('assert');
const { getServiceConfig } = require('../../mobile/src/utils/serviceConfig');

console.log('=== VERIFYING PERMANENT SERVICE REMOVAL & CATEGORY CLEANUP ===\n');

const removedIds = [
  'service_boiler_gas_repairs',
  'service_electrical_repairs',
  'service_babysitting',
  'service_elderly_companion_visits',
  'service_garden_waste_removal',
  'service_event_catering',
  'service_moving_help',
  'service_massage_wellness',
  'service_pet_sitting'
];

removedIds.forEach(srvId => {
  const config = getServiceConfig(srvId);
  console.log(`Checking ${srvId}: isActive=${config.isActive}`);
  assert.strictEqual(config.isActive, false, `Service ${srvId} should be inactive`);
  assert.strictEqual(config.isBookable, false, `Service ${srvId} should be unbookable`);
  assert.strictEqual(config.isVisible, false, `Service ${srvId} should be invisible`);
});

console.log('\n✅ ALL 9 RESTRICTED SERVICES ARE FULLY DEACTIVATED IN CENTRAL ENGINE!');

// Test Active Services
const cleanConfig = getServiceConfig('service_deep_cleaning', { id: 'service_deep_cleaning', name: 'Deep Cleaning' }, { id: 'cat_cleaning', name: 'Cleaning' });
assert.strictEqual(cleanConfig.isActive, true);
assert.strictEqual(cleanConfig.quantityConfig.unitLabel, 'Room');
console.log('✅ Active service Deep Cleaning remains 100% functional!');

console.log('\n🎉 PERMANENT SERVICE REMOVAL VERIFICATION PASSED 100% CLEAN!');
