const assert = require('assert');
const { getServiceConfig, resolveUnitConfig, getSchedulingConfig } = require('../../mobile/src/utils/serviceConfig');

console.log('=== VERIFYING CENTRAL SERVICE CONFIGURATION ENGINE ===\n');

// Test 1: Deep Cleaning
const deepCleanConfig = getServiceConfig('service_deep_cleaning', { id: 'service_deep_cleaning', name: 'Deep Cleaning' }, { id: 'cat_cleaning', name: 'Cleaning' });
console.log('Deep Cleaning Quantity Config:', deepCleanConfig.quantityConfig);
assert.strictEqual(deepCleanConfig.quantityConfig.unitLabel, 'Room');
assert.strictEqual(deepCleanConfig.quantityConfig.sectionTitle, 'Select Rooms');
assert.strictEqual(deepCleanConfig.quantityConfig.extraUnitPrice, 22.0);
assert.strictEqual(deepCleanConfig.durationConfig.type, 'fixed');
assert.strictEqual(deepCleanConfig.durationConfig.defaultDurationHours, 3);
console.log('✅ Deep Cleaning configuration verified!');

// Test 2: Boiler Repair
const boilerConfig = getServiceConfig('service_boiler_gas_repairs', { id: 'service_boiler_gas_repairs', name: 'Boiler & Gas Repairs' }, { id: 'cat_gas_services', name: 'Gas Services' });
console.log('\nBoiler Repair Provider Requirements:', boilerConfig.providerRequirements);
assert.ok(boilerConfig.providerRequirements.requiredCertifications.includes('GAS_SAFE_REGISTERED'));
assert.strictEqual(boilerConfig.quantityConfig.enabled, false);
console.log('✅ Boiler Repair configuration verified!');

// Test 3: Babysitting
const babyConfig = getServiceConfig('service_babysitting', { id: 'service_babysitting', name: 'Babysitting' }, { id: 'cat_childcare', name: 'Childcare' });
console.log('\nBabysitting Certifications & Form Fields:', babyConfig.providerRequirements, babyConfig.customerRequirements.map(f => f.key));
assert.ok(babyConfig.providerRequirements.requiredCertifications.includes('DBS_CHECKED'));
assert.ok(babyConfig.customerRequirements.some(f => f.key === 'numberOfChildren'));
console.log('✅ Babysitting configuration verified!');

// Test 4: Moving Help
const moveConfig = getServiceConfig('service_moving_help', { id: 'service_moving_help', name: 'Moving Help' }, { id: 'cat_moving', name: 'Moving' });
console.log('\nMoving Help Vehicles & Equipment:', moveConfig.providerRequirements);
assert.ok(moveConfig.providerRequirements.requiredVehicleTypes.length > 0);
assert.ok(moveConfig.providerRequirements.requiredEquipment.includes('trolley'));
console.log('✅ Moving Help configuration verified!');

console.log('\n🎉 ALL CENTRAL SERVICE CONFIGURATION ENGINE TESTS PASSED CLEANLY!');
