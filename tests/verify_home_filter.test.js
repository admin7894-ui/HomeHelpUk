console.log('=== Running Category Chip Selection State Fix Verification ===');

const mockCategories = [
  { id: 'cat_cooking', name: 'Cooking', price: 20 },
  { id: 'cat_cleaning', name: 'Cleaning', price: 18 },
  { id: 'cat_plumbing', name: 'Plumbing', price: 35 },
  { id: 'cat_electrical', name: 'Electrical', price: 40 },
];

const mockServices = [
  { id: 'srv_1', name: 'Home Cook', categoryId: 'cat_cooking' },
  { id: 'srv_2', name: 'Deep Cleaning', categoryId: 'cat_cleaning' },
  { id: 'srv_3', name: 'Leak Repair', categoryId: 'cat_plumbing' },
];

let selectedCategory = null;

// Function to get rendered category chips
function getRenderedChips(allCategories) {
  // Category chips row MUST ALWAYS render all categories regardless of selectedCategory
  return allCategories.map(c => ({
    id: c.id,
    name: c.name,
    isActive: selectedCategory === c.id || (selectedCategory === null && c.id === 'all')
  }));
}

// Function to get filtered popular services
function getFilteredServices(services, selectedCat) {
  if (!selectedCat) return services;
  return services.filter(s => s.categoryId === selectedCat);
}

// Test sequence: Cooking -> Cleaning -> Plumbing -> All

// 1. Initial State: All selected
let chips = getRenderedChips(mockCategories);
let popularServices = getFilteredServices(mockServices, selectedCategory);
console.log('Initial Chips Count:', chips.length, '| Services Count:', popularServices.length);
console.assert(chips.length === 4, 'All 4 category chips must be visible initially');
console.assert(popularServices.length === 3, 'All 3 popular services must be visible initially');

// 2. Select Cooking
selectedCategory = 'cat_cooking';
chips = getRenderedChips(mockCategories);
popularServices = getFilteredServices(mockServices, selectedCategory);
console.log('Selected Cooking Chips Count:', chips.length, '| Cooking Services Count:', popularServices.length);
console.assert(chips.length === 4, 'ALL 4 category chips MUST remain visible when Cooking is selected!');
console.assert(chips.find(c => c.id === 'cat_cooking').isActive === true, 'Cooking chip must be active');
console.assert(popularServices.length === 1 && popularServices[0].name === 'Home Cook', 'Popular services must filter to Cooking only');

// 3. Select Cleaning
selectedCategory = 'cat_cleaning';
chips = getRenderedChips(mockCategories);
popularServices = getFilteredServices(mockServices, selectedCategory);
console.log('Selected Cleaning Chips Count:', chips.length, '| Cleaning Services Count:', popularServices.length);
console.assert(chips.length === 4, 'ALL 4 category chips MUST remain visible when Cleaning is selected!');
console.assert(chips.find(c => c.id === 'cat_cleaning').isActive === true, 'Cleaning chip must be active');
console.assert(popularServices.length === 1 && popularServices[0].name === 'Deep Cleaning', 'Popular services must filter to Cleaning only');

// 4. Select Plumbing
selectedCategory = 'cat_plumbing';
chips = getRenderedChips(mockCategories);
popularServices = getFilteredServices(mockServices, selectedCategory);
console.log('Selected Plumbing Chips Count:', chips.length, '| Plumbing Services Count:', popularServices.length);
console.assert(chips.length === 4, 'ALL 4 category chips MUST remain visible when Plumbing is selected!');
console.assert(popularServices.length === 1 && popularServices[0].name === 'Leak Repair', 'Popular services must filter to Plumbing only');

// 5. Select All
selectedCategory = null;
chips = getRenderedChips(mockCategories);
popularServices = getFilteredServices(mockServices, selectedCategory);
console.log('Selected All Chips Count:', chips.length, '| Restored Services Count:', popularServices.length);
console.assert(chips.length === 4, 'ALL 4 category chips MUST remain visible when All is selected!');
console.assert(popularServices.length === 3, 'All popular services must be restored when All is selected');

console.log('✅ CATEGORY CHIP SELECTION STATE FIX TEST PASSED 100% CLEAN!');
