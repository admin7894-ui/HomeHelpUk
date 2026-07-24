const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories.json');

const structure = {
  "Cleaning": [
    "Standard House Cleaning",
    "Deep Cleaning",
    "End of Tenancy Cleaning",
    "Window Cleaning (Ground Floor)",
    "Oven Cleaning"
  ],
  "Laundry": [
    "Ironing",
    "Laundry Pickup & Delivery"
  ],
  "Gardening": [
    "Lawn Mowing",
    "Hedge Trimming",
    "Garden Maintenance",
    "Garden Waste Removal"
  ],
  "Handyman": [
    "Furniture Assembly",
    "TV Mounting",
    "Shelf Installation",
    "Curtain & Blind Installation",
    "Picture & Mirror Hanging"
  ],
  "Moving": [
    "Moving Help",
    "Packing & Unpacking"
  ],
  "Home Services": [
    "Home Organization",
    "Home Check Visits",
    "Plant Watering"
  ],
  "Pet Care": [
    "Dog Walking",
    "Pet Sitting"
  ],
  "Vehicle Care": [
    "Mobile Car Wash"
  ],
  "Beauty": [
    "Haircut (Home Service)",
    "Hair Styling",
    "Facial",
    "Waxing",
    "Threading",
    "Manicure",
    "Pedicure",
    "Makeup (Party)",
    "Bridal Makeup",
    "Massage (Wellness)"
  ],
  "Painting": [
    "Interior Painting"
  ],
  "Plumbing": [
    "Minor Plumbing Repairs"
  ],
  "Appliance": [
    "Appliance Installation (Non-Gas)"
  ],
  "Electrical": [
    "Electrical Repairs"
  ],
  "Gas Services": [
    "Boiler & Gas Repairs"
  ],
  "Childcare": [
    "Babysitting"
  ],
  "Care Services": [
    "Elderly Companion Visits"
  ]
};

function generateId(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
}

function run() {
  if (!fs.existsSync(categoriesPath)) {
    console.error('Categories file not found.');
    return;
  }
  
  let categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  let categoriesAdded = 0;
  let servicesAdded = 0;
  let duplicatesSkipped = 0;

  const categoriesBefore = categories.length;
  let servicesBefore = 0;
  categories.forEach(c => {
    (c.subcategories || []).forEach(sub => {
      servicesBefore += (sub.services || []).length;
    });
  });

  for (const [catName, serviceNames] of Object.entries(structure)) {
    // Find category
    let category = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    
    if (!category) {
      category = {
        id: `cat_${generateId(catName)}`,
        name: catName,
        icon: "construct",
        price: 45,
        unit: "hr",
        description: `${catName} services`,
        subcategories: [
          {
            id: `sub_${generateId(catName)}`,
            name: "General",
            services: []
          }
        ]
      };
      categories.push(category);
      categoriesAdded++;
    }

    // Ensure it has a subcategory to put services in
    if (!category.subcategories || category.subcategories.length === 0) {
      category.subcategories = [
        {
          id: `sub_${generateId(catName)}`,
          name: "General",
          services: []
        }
      ];
    }

    // Put all services in the first subcategory for simplicity, unless we find them elsewhere
    for (const serviceName of serviceNames) {
      let found = false;
      category.subcategories.forEach(sub => {
        if (!sub.services) sub.services = [];
        if (sub.services.find(s => s.name.toLowerCase() === serviceName.toLowerCase())) {
          found = true;
        }
      });

      if (found) {
        duplicatesSkipped++;
      } else {
        const newService = {
          id: `service_${generateId(serviceName)}`,
          name: serviceName,
          price: 45,
          unit: "hr",
          duration: "1-2 hrs",
          description: serviceName,
          ukTypicalPrice: "£40–£60",
          londonPrice: "£50–£70",
          mvpPrice: 45,
          canaryWharfPrice: "£60/hour",
          baseIncludes: "Standard service",
          additionalCharge: 10,
          maxQuantity: 5,
          pricingRule: "Standard pricing",
          certification: "No",
          mvp: true,
          notes: "",
          whatsIncluded: [],
          whatsNotIncluded: [],
          addons: [],
          faqs: [],
          dynamicPricing: {
            weekendMultiplier: 1.15,
            holidayMultiplier: 1.25,
            emergencyMultiplier: 1.20,
            travelChargeBaseKm: 5,
            travelChargePerKm: 2
          }
        };
        category.subcategories[0].services.push(newService);
        servicesAdded++;
      }
    }
  }

  // Ensure Cooking is at index 0
  const cookingIndex = categories.findIndex(c => c.name.toLowerCase() === 'cooking');
  if (cookingIndex > 0) {
    const cookingCat = categories.splice(cookingIndex, 1)[0];
    categories.unshift(cookingCat);
  }

  const categoriesAfter = categories.length;
  let servicesAfter = 0;
  categories.forEach(c => {
    (c.subcategories || []).forEach(sub => {
      servicesAfter += (sub.services || []).length;
    });
  });

  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));

  console.log(`
Migration Complete:
Categories before: ${categoriesBefore}
Categories added: ${categoriesAdded}
Categories after: ${categoriesAfter}
Services before: ${servicesBefore}
Services added: ${servicesAdded}
Services after: ${servicesAfter}
Duplicates skipped: ${duplicatesSkipped}
Existing records modified: 0
Cooking position: ${categories[0].name === 'Cooking' ? 'index 0 (Correct)' : 'INCORRECT'}
  `);
}

run();
