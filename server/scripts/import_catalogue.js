const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories.json');

const cookingServicesData = [
  {
    id: "service_home_cook",
    name: "Home Cook (Basic Meal Preparation)",
    price: 20,
    unit: "hr",
    duration: "2-4 hrs",
    description: "Basic meal preparation for individuals and small families.",
    ukTypicalPrice: "£15–£25",
    londonPrice: "£20–£35",
    mvpPrice: 20,
    canaryWharfPrice: "£19/hour",
    baseIncludes: "1–4 Persons",
    additionalCharge: 3,
    maxQuantity: 10,
    pricingRule: "Price increases after 4 persons",
    certification: "No, Food Hygiene Level 2 Recommended",
    mvp: true,
    notes: "Customer provides ingredients.",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_family_meal_prep",
    name: "Family Meal Preparation",
    price: 28,
    unit: "hr",
    duration: "2-4 hrs",
    description: "Multiple meals for family.",
    ukTypicalPrice: "£20–£35",
    londonPrice: "£25–£40",
    mvpPrice: 28,
    canaryWharfPrice: "£20/hour",
    baseIncludes: "1–4 Persons",
    additionalCharge: 3,
    maxQuantity: 10,
    pricingRule: "Multiple meals for family",
    certification: "No, Food Hygiene Level 2 Recommended",
    mvp: true,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_weekly_meal_prep",
    name: "Weekly Meal Prep",
    price: 90,
    unit: "visit",
    duration: "4-6 hrs",
    description: "Prepare meals for 3–7 days.",
    ukTypicalPrice: "£60–£120",
    londonPrice: "£80–£150",
    mvpPrice: 90,
    canaryWharfPrice: "£99/visit",
    baseIncludes: "Up to 4 Persons",
    additionalCharge: 15,
    maxQuantity: 10,
    pricingRule: "Weekly package pricing",
    certification: "No, Food Hygiene Level 2 Recommended",
    mvp: true,
    notes: "Prepare meals for 3–7 days.",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_healthy_meal_prep",
    name: "Healthy Meal Preparation",
    price: 32,
    unit: "hr",
    duration: "2-4 hrs",
    description: "Special dietary meals.",
    ukTypicalPrice: "£25–£40",
    londonPrice: "£30–£50",
    mvpPrice: 32,
    canaryWharfPrice: "£20/hour",
    baseIncludes: "1–4 Persons",
    additionalCharge: 4,
    maxQuantity: 8,
    pricingRule: "Special dietary meals",
    certification: "No, Nutrition Knowledge Preferred",
    mvp: true,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_vegetarian_meal_prep",
    name: "Vegetarian Meal Preparation",
    price: 28,
    unit: "hr",
    duration: "2-4 hrs",
    description: "Specialised vegetarian meal cooking.",
    ukTypicalPrice: "£20–£35",
    londonPrice: "£25–£40",
    mvpPrice: 28,
    canaryWharfPrice: "£20/hour",
    baseIncludes: "1–4 Persons",
    additionalCharge: 3,
    maxQuantity: 10,
    pricingRule: "",
    certification: "No",
    mvp: true,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_vegan_meal_prep",
    name: "Vegan Meal Preparation",
    price: 30,
    unit: "hr",
    duration: "2-4 hrs",
    description: "Specialised vegan meal cooking.",
    ukTypicalPrice: "£22–£38",
    londonPrice: "£28–£45",
    mvpPrice: 30,
    canaryWharfPrice: "£21/hour",
    baseIncludes: "1–4 Persons",
    additionalCharge: 3,
    maxQuantity: 10,
    pricingRule: "",
    certification: "No",
    mvp: true,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_indian_home_cooking",
    name: "Indian Private Chef",
    price: 28,
    unit: "hr",
    duration: "2-4 hrs",
    description: "Traditional Indian private chef services. Popular among South Asian families.",
    ukTypicalPrice: "£20–£35",
    londonPrice: "£25–£40",
    mvpPrice: 28,
    canaryWharfPrice: "£19/hour",
    baseIncludes: "1–4 Persons",
    additionalCharge: 3,
    maxQuantity: 10,
    pricingRule: "",
    certification: "No",
    mvp: true,
    notes: "Popular among South Asian families.",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_asian_cuisine_cooking",
    name: "Asian Cuisine Cooking",
    price: 30,
    unit: "hr",
    duration: "2-4 hrs",
    description: "Chinese, Thai, Japanese, etc.",
    ukTypicalPrice: "£22–£38",
    londonPrice: "£28–£45",
    mvpPrice: 30,
    canaryWharfPrice: "£21/hour",
    baseIncludes: "1–4 Persons",
    additionalCharge: 4,
    maxQuantity: 10,
    pricingRule: "",
    certification: "No",
    mvp: true,
    notes: "Chinese, Thai, Japanese, etc.",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_continental_cooking",
    name: "Continental Cooking",
    price: 32,
    unit: "hr",
    duration: "2-4 hrs",
    description: "Continental cuisine cooking.",
    ukTypicalPrice: "£22–£40",
    londonPrice: "£30–£45",
    mvpPrice: 32,
    canaryWharfPrice: "£22/hour",
    baseIncludes: "1–4 Persons",
    additionalCharge: 4,
    maxQuantity: 10,
    pricingRule: "",
    certification: "No",
    mvp: true,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_bbq_grill_cooking",
    name: "BBQ / Grill Cooking",
    price: 40,
    unit: "hr",
    duration: "4-6 hrs",
    description: "Outdoor BBQ and grill preparation for events.",
    ukTypicalPrice: "£30–£50",
    londonPrice: "£40–£60",
    mvpPrice: 40,
    canaryWharfPrice: "£40/hour",
    baseIncludes: "Up to 10 Persons",
    additionalCharge: 5,
    maxQuantity: 50,
    pricingRule: "",
    certification: "No, Food Hygiene Recommended",
    mvp: false,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_party_cooking",
    name: "Party Cooking (Small Gathering)",
    price: 150,
    unit: "event",
    duration: "4-6 hrs",
    description: "Event catering for small gatherings.",
    ukTypicalPrice: "£80–£200",
    londonPrice: "£120–£300",
    mvpPrice: 150,
    canaryWharfPrice: "£150/event",
    baseIncludes: "Up to 20 Guests",
    additionalCharge: 8,
    maxQuantity: 100,
    pricingRule: "",
    certification: "No, Food Hygiene Level 2 Recommended",
    mvp: false,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_private_chef",
    name: "Private Chef (Home Dining)",
    price: 180,
    unit: "event",
    duration: "3-5 hrs",
    description: "High-end private chef home dining experience.",
    ukTypicalPrice: "£120–£300",
    londonPrice: "£180–£500",
    mvpPrice: 180,
    canaryWharfPrice: "£250/event",
    baseIncludes: "Up to 4 Guests",
    additionalCharge: 25,
    maxQuantity: 20,
    pricingRule: "",
    certification: "No, Professional Chef Experience Preferred",
    mvp: false,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_breakfast_prep",
    name: "Breakfast Preparation",
    price: 20,
    unit: "visit",
    duration: "1-2 hrs",
    description: "Morning breakfast cooking.",
    ukTypicalPrice: "£15–£25",
    londonPrice: "£20–£30",
    mvpPrice: 20,
    canaryWharfPrice: "£18/visit",
    baseIncludes: "Up to 4 Persons",
    additionalCharge: 2,
    maxQuantity: 8,
    pricingRule: "",
    certification: "No",
    mvp: true,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_lunch_prep",
    name: "Lunch Preparation",
    price: 25,
    unit: "visit",
    duration: "1-2 hrs",
    description: "Lunch meal cooking.",
    ukTypicalPrice: "£20–£30",
    londonPrice: "£25–£35",
    mvpPrice: 25,
    canaryWharfPrice: "£19/visit",
    baseIncludes: "Up to 4 Persons",
    additionalCharge: 3,
    maxQuantity: 8,
    pricingRule: "",
    certification: "No",
    mvp: true,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_dinner_prep",
    name: "Dinner Preparation",
    price: 30,
    unit: "visit",
    duration: "2-3 hrs",
    description: "Dinner meal cooking.",
    ukTypicalPrice: "£20–£35",
    londonPrice: "£25–£40",
    mvpPrice: 30,
    canaryWharfPrice: "£20/visit",
    baseIncludes: "Up to 4 Persons",
    additionalCharge: 3,
    maxQuantity: 8,
    pricingRule: "",
    certification: "No",
    mvp: true,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_baby_food_prep",
    name: "Baby Food Preparation",
    price: 28,
    unit: "visit",
    duration: "1-2 hrs",
    description: "Safe, healthy baby food prep.",
    ukTypicalPrice: "£20–£35",
    londonPrice: "£25–£40",
    mvpPrice: 28,
    canaryWharfPrice: "£20/visit",
    baseIncludes: "1 Child",
    additionalCharge: 8,
    maxQuantity: 4,
    pricingRule: "",
    certification: "No, Food Hygiene Recommended",
    mvp: false,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_elderly_meal_prep",
    name: "Elderly Meal Preparation",
    price: 28,
    unit: "visit",
    duration: "1-2 hrs",
    description: "Nutritious meal preparation tailored for the elderly.",
    ukTypicalPrice: "£20–£35",
    londonPrice: "£25–£40",
    mvpPrice: 28,
    canaryWharfPrice: "£19/visit",
    baseIncludes: "Up to 2 Persons",
    additionalCharge: 5,
    maxQuantity: 4,
    pricingRule: "",
    certification: "No, Food Hygiene Recommended",
    mvp: true,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_festival_cooking",
    name: "Festival & Traditional Cooking",
    price: 75,
    unit: "event",
    duration: "4-6 hrs",
    description: "Festive and traditional mass cooking.",
    ukTypicalPrice: "£40–£100",
    londonPrice: "£60–£150",
    mvpPrice: 75,
    canaryWharfPrice: "£180/event",
    baseIncludes: "Up to 15 Guests",
    additionalCharge: 10,
    maxQuantity: 100,
    pricingRule: "",
    certification: "No",
    mvp: false,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  },
  {
    id: "service_baking",
    name: "Baking (Basic Cakes & Cookies)",
    price: 45,
    unit: "order",
    duration: "2-3 hrs",
    description: "Home baked goods.",
    ukTypicalPrice: "£30–£60",
    londonPrice: "£40–£80",
    mvpPrice: 45,
    canaryWharfPrice: "£45/order",
    baseIncludes: "1 kg Cake / 12 Cookies",
    additionalCharge: 15,
    maxQuantity: 20,
    pricingRule: "",
    certification: "No, Food Business Registration may apply if prepared off-site",
    mvp: false,
    notes: "",
    whatsIncluded: [], whatsNotIncluded: [], addons: [], faqs: []
  }
];

const cookingCategory = {
  id: "cat_cooking",
  name: "Private Chef",
  icon: "restaurant",
  price: 20,
  unit: "hr",
  description: "Professional private chef services, meal prep, and event catering.",
  subcategories: [
    {
      id: "sub_meal_prep",
      name: "Meal Preparation",
      services: [
        cookingServicesData[0], // Home Cook
        cookingServicesData[1], // Family Meal Prep
        cookingServicesData[2], // Weekly Meal Prep
        cookingServicesData[3], // Healthy Meal Prep
        cookingServicesData[4], // Vegetarian
        cookingServicesData[5], // Vegan
        cookingServicesData[6], // Indian
        cookingServicesData[7], // Asian
        cookingServicesData[8], // Continental
        cookingServicesData[12], // Breakfast
        cookingServicesData[13], // Lunch
        cookingServicesData[14], // Dinner
        cookingServicesData[15], // Baby Food
        cookingServicesData[16] // Elderly Meal
      ]
    },
    {
      id: "sub_events_baking",
      name: "Events & Baking",
      services: [
        cookingServicesData[9], // BBQ
        cookingServicesData[10], // Party
        cookingServicesData[11], // Private Chef
        cookingServicesData[17], // Festival
        cookingServicesData[18] // Baking
      ]
    }
  ]
};

function run() {
  if (!fs.existsSync(categoriesPath)) {
    console.error('Categories file not found.');
    return;
  }
  let categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  
  // Check if Cooking already exists
  const existingIndex = categories.findIndex(c => c.name.toLowerCase() === 'cooking');
  
  if (existingIndex > -1) {
    // Already exists. Just move it to the front if it's not.
    if (existingIndex !== 0) {
      const cat = categories.splice(existingIndex, 1)[0];
      categories.unshift(cat);
      console.log('Cooking category already existed. Moved to front.');
    } else {
      console.log('Cooking category already exists at the front.');
    }
  } else {
    // Insert new Cooking category at the front
    categories.unshift(cookingCategory);
    console.log('Inserted Cooking category at the front.');
  }

  // To support new dynamic pricing fields for all new services across the platform:
  // Add common dynamic pricing fields to all services in Cooking.
  categories.forEach(cat => {
    if (cat.name === 'Cooking') {
      cat.subcategories.forEach(sub => {
        sub.services.forEach(srv => {
          if (!srv.dynamicPricing) {
            srv.dynamicPricing = {
              weekendMultiplier: 1.15,
              holidayMultiplier: 1.25,
              emergencyMultiplier: 1.20,
              travelChargeBaseKm: 5,
              travelChargePerKm: 2
            };
          }
        });
      });
    }
  });

  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
  console.log('Successfully updated categories.json');
}

run();
