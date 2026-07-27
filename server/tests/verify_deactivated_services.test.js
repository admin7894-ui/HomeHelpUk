const assert = require('assert');
const { getServiceConfig } = require('../../mobile/src/utils/serviceConfig');

console.log('=== VERIFYING DEACTIVATION OF REGULATORILY COMPLEX SERVICES ===\n');

// Test 1: Boiler & Gas Repairs (Deactivated)
const boilerConfig = getServiceConfig('service_boiler_gas_repairs', { id: 'service_boiler_gas_repairs', name: 'Boiler & Gas Repairs' }, { id: 'cat_gas_services', name: 'Gas Services' });
console.log('Boiler & Gas Config:', { isActive: boilerConfig.isActive, isBookable: boilerConfig.isBookable, isVisible: boilerConfig.isVisible, riskLevel: boilerConfig.legalRiskLevel });
assert.strictEqual(boilerConfig.isActive, false);
assert.strictEqual(boilerConfig.isBookable, false);
assert.strictEqual(boilerConfig.isVisible, false);
assert.strictEqual(boilerConfig.legalRiskLevel, 'VERY_HIGH');
console.log('✅ Boiler & Gas Repairs deactivation verified!');

// Test 2: Electrical Repairs (Deactivated)
const elecConfig = getServiceConfig('service_electrical_repairs', { id: 'service_electrical_repairs', name: 'Electrical Repairs' }, { id: 'cat_electrical', name: 'Electrical' });
console.log('Electrical Repairs Config:', { isActive: elecConfig.isActive, isBookable: elecConfig.isBookable, isVisible: elecConfig.isVisible, riskLevel: elecConfig.legalRiskLevel });
assert.strictEqual(elecConfig.isActive, false);
assert.strictEqual(elecConfig.isBookable, false);
assert.strictEqual(elecConfig.isVisible, false);
console.log('✅ Electrical Repairs deactivation verified!');

// Test 3: Window Cleaning (Renamed & Scope Restricted)
const windowConfig = getServiceConfig('service_window', { id: 'service_window', name: 'Interior Window Cleaning' }, { id: 'cat_cleaning', name: 'Cleaning' });
console.log('Window Cleaning Config:', { isActive: windowConfig.isActive, sectionTitle: windowConfig.quantityConfig.sectionTitle, excludedScope: windowConfig.excludedScope });
assert.strictEqual(windowConfig.isActive, true);
assert.strictEqual(windowConfig.quantityConfig.unitLabel, 'Window');
assert.ok(windowConfig.excludedScope.includes('Exterior high-rise window cleaning'));
console.log('✅ Interior Window Cleaning scope restriction verified!');

console.log('\n🎉 ALL DEACTIVATION & SCOPE BOUNDARY TESTS PASSED 100% CLEAN!');
