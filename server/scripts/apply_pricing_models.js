const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

// Service pricing model definition map
const PRICING_MAP = {
  // Category A: Additional Person Services
  service_home_cook: { model: 'per_person', incQty: 4, unit: 'person', addPrice: 10, min: 1, max: 12 },
  service_family_meal_prep: { model: 'per_person', incQty: 4, unit: 'person', addPrice: 12, min: 1, max: 12 },
  service_weekly_meal_prep: { model: 'per_person', incQty: 2, unit: 'person', addPrice: 15, min: 1, max: 8 },
  service_healthy_meal_prep: { model: 'per_person', incQty: 2, unit: 'person', addPrice: 10, min: 1, max: 10 },
  service_vegetarian_meal_prep: { model: 'per_person', incQty: 2, unit: 'person', addPrice: 10, min: 1, max: 10 },
  service_vegan_meal_prep: { model: 'per_person', incQty: 2, unit: 'person', addPrice: 10, min: 1, max: 10 },
  service_indian_home_cooking: { model: 'per_person', incQty: 4, unit: 'person', addPrice: 10, min: 1, max: 12 },
  service_asian_cuisine_cooking: { model: 'per_person', incQty: 4, unit: 'person', addPrice: 10, min: 1, max: 12 },
  service_continental_cooking: { model: 'per_person', incQty: 4, unit: 'person', addPrice: 12, min: 1, max: 12 },
  service_breakfast_prep: { model: 'per_person', incQty: 2, unit: 'person', addPrice: 8, min: 1, max: 8 },
  service_lunch_prep: { model: 'per_person', incQty: 2, unit: 'person', addPrice: 9, min: 1, max: 8 },
  service_dinner_prep: { model: 'per_person', incQty: 2, unit: 'person', addPrice: 10, min: 1, max: 8 },
  service_elderly_meal_prep: { model: 'per_person', incQty: 1, unit: 'person', addPrice: 10, min: 1, max: 4 },
  service_bbq_grill_cooking: { model: 'per_person', incQty: 6, unit: 'person', addPrice: 15, min: 2, max: 25 },
  service_party_cooking: { model: 'per_person', incQty: 8, unit: 'person', addPrice: 15, min: 4, max: 30 },
  service_private_chef: { model: 'per_person', incQty: 4, unit: 'person', addPrice: 25, min: 2, max: 16 },
  service_festival_cooking: { model: 'per_person', incQty: 6, unit: 'person', addPrice: 12, min: 2, max: 20 },
  service_babysitting: { model: 'per_child', incQty: 1, unit: 'child', addPrice: 5, min: 1, max: 5 },
  service_elderly_companion_visits: { model: 'per_person', incQty: 1, unit: 'person', addPrice: 10, min: 1, max: 3 },
  service_makeup_party: { model: 'per_person', incQty: 1, unit: 'person', addPrice: 35, min: 1, max: 6 },
  service_bridal_makeup: { model: 'per_person', incQty: 1, unit: 'person', addPrice: 45, min: 1, max: 8 },

  // Category B: Additional Unit Services (Rooms, Windows, Items, Hours, Pets, Bags)
  service_standard_cleaning: { model: 'per_hour', incQty: 2, unit: 'hour', addPrice: 18, min: 2, max: 8 },
  service_deep_cleaning: { model: 'per_room', incQty: 3, unit: 'room', addPrice: 20, min: 1, max: 10 },
  service_bathroom_deep: { model: 'per_unit', incQty: 1, unit: 'bathroom', addPrice: 25, min: 1, max: 5 },
  service_full_house_deep: { model: 'per_room', incQty: 2, unit: 'bedroom', addPrice: 25, min: 1, max: 7 },
  service_standard_house_cleaning: { model: 'per_hour', incQty: 2, unit: 'hour', addPrice: 20, min: 2, max: 8 },
  service_window_cleaning_ground_floor: { model: 'per_window', incQty: 5, unit: 'window', addPrice: 5, min: 2, max: 30 },
  service_move_in: { model: 'per_room', incQty: 2, unit: 'bedroom', addPrice: 20, min: 1, max: 6 },
  service_eot: { model: 'per_room', incQty: 2, unit: 'bedroom', addPrice: 25, min: 1, max: 6 },
  service_sofa: { model: 'per_item', incQty: 2, unit: 'seat', addPrice: 15, min: 1, max: 8 },
  service_carpet: { model: 'per_room', incQty: 1, unit: 'room', addPrice: 25, min: 1, max: 8 },
  service_window: { model: 'per_window', incQty: 5, unit: 'window', addPrice: 5, min: 2, max: 30 },
  service_tap_install: { model: 'per_item', incQty: 1, unit: 'tap', addPrice: 25, min: 1, max: 5 },
  service_light_install: { model: 'per_item', incQty: 1, unit: 'light', addPrice: 20, min: 1, max: 10 },
  service_cctv_install: { model: 'per_item', incQty: 2, unit: 'camera', addPrice: 40, min: 1, max: 8 },
  service_socket_install: { model: 'per_item', incQty: 1, unit: 'socket', addPrice: 20, min: 1, max: 10 },
  service_furniture_assembly: { model: 'per_hour', incQty: 1, unit: 'hour', addPrice: 35, min: 1, max: 8 },
  service_tv_mounting: { model: 'per_item', incQty: 1, unit: 'TV', addPrice: 35, min: 1, max: 4 },
  service_shelf_install: { model: 'per_item', incQty: 2, unit: 'shelf', addPrice: 10, min: 1, max: 10 },
  service_curtain_blind_installation: { model: 'per_window', incQty: 1, unit: 'window', addPrice: 20, min: 1, max: 10 },
  service_picture_mirror_hanging: { model: 'per_item', incQty: 3, unit: 'item', addPrice: 10, min: 1, max: 15 },
  service_interior_paint: { model: 'per_room', incQty: 1, unit: 'room', addPrice: 100, min: 1, max: 8 },
  service_wallpaper: { model: 'per_item', incQty: 1, unit: 'wall', addPrice: 40, min: 1, max: 8 },
  service_lawn_mowing: { model: 'per_unit', incQty: 1, unit: 'section', addPrice: 15, min: 1, max: 5 },
  service_hedge_trim: { model: 'per_item', incQty: 1, unit: 'hedge', addPrice: 20, min: 1, max: 5 },
  service_garden_clean: { model: 'per_hour', incQty: 2, unit: 'hour', addPrice: 25, min: 1, max: 6 },
  service_garden_maintenance: { model: 'per_hour', incQty: 2, unit: 'hour', addPrice: 25, min: 2, max: 8 },
  service_garden_waste_removal: { model: 'per_item', incQty: 2, unit: 'bag', addPrice: 8, min: 1, max: 10 },
  service_ironing: { model: 'per_item', incQty: 15, unit: 'item', addPrice: 1.5, min: 5, max: 50 },
  service_laundry_pickup_delivery: { model: 'per_item', incQty: 1, unit: 'bag (5kg)', addPrice: 10, min: 1, max: 5 },
  service_moving_help: { model: 'per_hour', incQty: 2, unit: 'hour', addPrice: 30, min: 2, max: 8 },
  service_packing_unpacking: { model: 'per_item', incQty: 10, unit: 'box', addPrice: 3, min: 5, max: 50 },
  service_home_organization: { model: 'per_hour', incQty: 2, unit: 'hour', addPrice: 25, min: 2, max: 8 },
  service_dog_walking: { model: 'per_pet', incQty: 1, unit: 'dog', addPrice: 10, min: 1, max: 4 },
  service_pet_sitting: { model: 'per_pet', incQty: 1, unit: 'pet', addPrice: 12, min: 1, max: 5 },
  service_mobile_car_wash: { model: 'per_item', incQty: 1, unit: 'car', addPrice: 20, min: 1, max: 4 },
  service_appliance_installation_non_gas: { model: 'per_item', incQty: 1, unit: 'appliance', addPrice: 25, min: 1, max: 4 },

  // Category C: Fixed Price Services
  service_baby_food_prep: { model: 'fixed', incQty: 1, unit: 'batch', addPrice: 0, min: 1, max: 5 },
  service_baking: { model: 'fixed', incQty: 1, unit: 'order', addPrice: 0, min: 1, max: 5 },
  service_kitchen_deep: { model: 'fixed', incQty: 1, unit: 'kitchen', addPrice: 0, min: 1, max: 2 },
  service_oven_cleaning: { model: 'fixed', incQty: 1, unit: 'oven', addPrice: 0, min: 1, max: 3 },
  service_toilet_repair: { model: 'fixed', incQty: 1, unit: 'toilet', addPrice: 0, min: 1, max: 3 },
  service_haircut_home_service: { model: 'fixed', incQty: 1, unit: 'person', addPrice: 0, min: 1, max: 5 },
  service_hair_styling: { model: 'fixed', incQty: 1, unit: 'person', addPrice: 0, min: 1, max: 5 },
  service_facial: { model: 'fixed', incQty: 1, unit: 'session', addPrice: 0, min: 1, max: 3 },
  service_waxing: { model: 'fixed', incQty: 1, unit: 'session', addPrice: 0, min: 1, max: 3 },
  service_threading: { model: 'fixed', incQty: 1, unit: 'session', addPrice: 0, min: 1, max: 3 },
  service_manicure: { model: 'fixed', incQty: 1, unit: 'session', addPrice: 0, min: 1, max: 3 },
  service_pedicure: { model: 'fixed', incQty: 1, unit: 'session', addPrice: 0, min: 1, max: 3 },
  service_massage_wellness: { model: 'fixed', incQty: 1, unit: 'session', addPrice: 0, min: 1, max: 3 },
  service_home_check_visits: { model: 'fixed', incQty: 1, unit: 'visit', addPrice: 0, min: 1, max: 10 },
  service_plant_watering: { model: 'fixed', incQty: 1, unit: 'visit', addPrice: 0, min: 1, max: 10 },

  // Category D: Diagnostic / Quote Services
  service_leak_repair: { model: 'quote', incQty: 1, unit: 'hour', addPrice: 45, min: 1, max: 5 },
  service_minor_plumbing_repairs: { model: 'quote', incQty: 1, unit: 'hour', addPrice: 45, min: 1, max: 6 },
  service_electrical_repairs: { model: 'quote', incQty: 1, unit: 'hour', addPrice: 45, min: 1, max: 6 },
  service_boiler_gas_repairs: { model: 'quote', incQty: 1, unit: 'hour', addPrice: 60, min: 1, max: 5 }
};

let count = 0;

categories.forEach(cat => {
  if (cat.subcategories) {
    cat.subcategories.forEach(sub => {
      if (sub.services) {
        sub.services = sub.services.map(srv => {
          count++;
          const cfg = PRICING_MAP[srv.id] || { model: 'fixed', incQty: 1, unit: srv.unit || 'visit', addPrice: 0, min: 1, max: 10 };
          
          srv.pricingRules = {
            pricingModel: cfg.model,
            basePrice: Number(srv.price) || 25,
            includedQuantity: cfg.incQty,
            includedUnit: cfg.unit,
            additionalUnitPrice: cfg.addPrice,
            additionalUnit: cfg.unit,
            minimumQuantity: cfg.min,
            maximumQuantity: cfg.max
          };

          return srv;
        });
      }
    });
  }
});

fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8');
console.log(`Updated pricing models for all ${count} services in categories.json successfully!`);
