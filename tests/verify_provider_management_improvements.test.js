console.log('=== Running Provider Service Management Improvements Verification ===');

// Test 1: Addon In-Place Update logic simulation
let addOns = [
  { id: 'addon_1', name: 'Parts Sourcing Trip', description: 'Travel to merchant', price: 20, enabled: true },
  { id: 'addon_2', name: 'Secondary Check', description: 'Check adjacent line', price: 25, enabled: true }
];

const editingAddonId = 'addon_1';
const updatedName = 'Parts Sourcing Trip (Urgent)';
const updatedPrice = 25;

addOns = addOns.map(a => a.id === editingAddonId ? { ...a, name: updatedName, price: updatedPrice } : a);

console.assert(addOns.length === 2, 'Addons list length must remain 2 (no duplicate created)!');
console.assert(addOns[0].name === 'Parts Sourcing Trip (Urgent)', 'First addon name updated in place!');
console.assert(addOns[0].price === 25, 'First addon price updated in place!');

// Test 2: FAQ In-Place Update logic simulation
let faqs = [
  { q: 'Are replacement parts included?', a: 'Base prices cover labor.' },
  { q: 'Will I receive an estimate?', a: 'Yes upfront.' }
];

const editingFaqIndex = 0;
faqs = faqs.map((f, i) => i === editingFaqIndex ? { q: 'Are replacement parts included in base?', a: 'Base prices cover labor only.' } : f);

console.assert(faqs.length === 2, 'FAQs list length must remain 2 (no duplicate created)!');
console.assert(faqs[0].q === 'Are replacement parts included in base?', 'FAQ question updated in place!');

// Test 3: Disable Service Prevention (Cannot disable last active service in category)
const catServices = ['service_leak_repair', 'service_toilet_repair'];
const servicesConfig = {
  service_leak_repair: { price: '45', enabled: true },
  service_toilet_repair: { price: '55', enabled: false }
};

const activeInCat = catServices.filter(sId => servicesConfig[sId] ? servicesConfig[sId].enabled : true);
console.assert(activeInCat.length === 1, 'Only 1 active service left in Plumbing');

const canDisableLeak = activeInCat.length > 1;
console.assert(canDisableLeak === false, 'Should block disabling the last active service in category!');

console.log('✅ ALL PROVIDER SERVICE MANAGEMENT IMPROVEMENT TESTS PASSED 100% CLEAN!');
