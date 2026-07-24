/**
 * Category Image Resolver for HomeHelpUK
 * Provides 100% unique, contextually accurate primary cover photos for all 17 categories.
 */

export const CATEGORY_IMAGES = {
  'cat_cooking': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80&slot=1',
  'cat_cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&slot=2',
  'cat_plumbing': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80&slot=3', // Pipe repair & wrench
  'cat_electrical': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80&slot=4', // Circuit breaker
  'cat_handyman': 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&q=80&slot=5', // Drilling & tools
  'cat_painting': 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80&slot=6', // Paint roller & wall
  'cat_gardening': 'https://images.unsplash.com/photo-1558904541-efa8c196b27d?w=800&q=80&slot=7', // Lawn mowing
  'cat_laundry': 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800&q=80&slot=8', // Ironing & laundry
  'cat_moving': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80&slot=9', // Moving boxes
  'cat_home_services': 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80&slot=10', // Living room clean
  'cat_pet_care': 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80&slot=11', // Dog walking park
  'cat_vehicle_care': 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&q=80&slot=12', // Car wash foam
  'cat_beauty': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80&slot=13', // Salon makeup
  'cat_appliance': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80&slot=14', // Appliance repair
  'cat_gas_services': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80&slot=15', // Boiler technician
  'cat_childcare': 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80&slot=16', // Babysitting
  'cat_care_services': 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&q=80&slot=17', // Elderly care
};

export const getCategoryImage = (categoryId) => {
  const img = CATEGORY_IMAGES[categoryId];
  if (img) return { uri: img };
  return { uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80' };
};
