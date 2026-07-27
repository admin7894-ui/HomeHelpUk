require('dotenv').config({ path: './.env' });
const fs = require('fs');
const path = require('path');
const db = require('../db');

// Service specific inclusions generator
function getServiceInclusions(serviceId, name, categoryName) {
  const n = (name || '').toLowerCase();
  const cat = (categoryName || '').toLowerCase();

  // Private Chef / Cooking
  if (cat.includes('chef') || cat.includes('cook') || n.includes('chef') || n.includes('cook') || n.includes('meal')) {
    if (n.includes('indian')) {
      return [
        "Preparation of authentic Indian curries, bread & rice dishes",
        "Fresh spice grinding & ingredient handling in compliance with hygiene standards",
        "Custom spice level and dietary preference adjustments",
        "Kitchen counter and cooking area wipe down post-preparation"
      ];
    }
    if (n.includes('asian')) {
      return [
        "Preparation of traditional Asian stir-fries, noodles, and dim sum",
        "Handling of fresh produce and authentic seasonings",
        "Dietary customization (gluten-free, soy-free options)",
        "Kitchen stove & counter surface cleaning post-cooking"
      ];
    }
    if (n.includes('bbq') || n.includes('grill')) {
      return [
        "Marination and outdoor grill preparation of meats and skewers",
        "Safe food temperature monitoring & hygienic handling",
        "Serving platter presentation for outdoor gatherings",
        "Grill rack scraping and workstation cleanup"
      ];
    }
    if (n.includes('baking')) {
      return [
        "Custom baking of fresh sponge cakes, cookies, or pastries",
        "Frosting, icing, and decorative presentation",
        "Use of client's oven per calibrated temperatures",
        "Baking tray and mixing bowl cleanup"
      ];
    }
    return [
      "Professional meal preparation by experienced chef",
      "Fresh ingredient handling and hygienic food preparation",
      "Customisation based on agreed dietary requirements",
      "Kitchen surface wipe-down after cooking"
    ];
  }

  // Cleaning
  if (cat.includes('clean') || n.includes('clean')) {
    if (n.includes('deep')) {
      return [
        "Deep scrubbing of kitchen counters, splashbacks, and appliances exterior",
        "Limescale removal from taps, shower heads, and bathroom tiles",
        "Vacuuming under reachable furniture & thorough hard floor mopping",
        "Dusting skirtings, door frames, and light switches"
      ];
    }
    if (n.includes('tenancy')) {
      return [
        "Full end-of-tenancy deposit-guaranteed deep clean checklist",
        "Inside cupboard and drawer wiping (if empty)",
        "Internal window glass and sill wiping",
        "Bathroom & kitchen descaling and sanitisation"
      ];
    }
    return [
      "Dusting accessible furniture and surfaces",
      "Vacuuming carpets and rugs",
      "Mopping hard flooring",
      "Sanitising kitchen sink, worktops, and bathroom fixtures",
      "General tidying and trash bin emptying"
    ];
  }

  // Plumbing
  if (cat.includes('plumb') || n.includes('plumb') || n.includes('leak') || n.includes('tap') || n.includes('toilet')) {
    if (n.includes('leak')) {
      return [
        "Initial leak diagnosis and source identification",
        "Minor pipe or joint fitting repair",
        "Replacement of standard washers or rubber seals",
        "Post-repair water pressure test"
      ];
    }
    if (n.includes('tap')) {
      return [
        "Removal of old tap unit",
        "Installation and sealing of new client-supplied tap",
        "Flexible hose connection and leak verification",
        "Water flow test"
      ];
    }
    return [
      "Diagnostic check of plumbing issue",
      "Minor pipe joint tightening and washer replacement",
      "Sealing exposed pipe joints",
      "System flow testing after repair"
    ];
  }

  // Electrical
  if (cat.includes('electr') || n.includes('socket') || n.includes('light') || n.includes('cctv')) {
    if (n.includes('cctv')) {
      return [
        "Mounting of up to 4 wireless or wired CCTV cameras",
        "DVR/NVR power setup and network integration",
        "Mobile app pairing and motion alert configuration",
        "Camera angle testing and user demonstration"
      ];
    }
    return [
      "Circuit safety testing before work begins",
      "Removal of existing fixture and secure fitting of new unit",
      "Polarity and earthing verification",
      "Operational testing and safety check"
    ];
  }

  // Handyman & Furniture
  if (cat.includes('handyman') || cat.includes('furniture') || n.includes('assembly') || n.includes('shelf') || n.includes('tv') || n.includes('curtain')) {
    if (n.includes('assembly')) {
      return [
        "Unpacking flat-pack furniture components",
        "Step-by-step assembly according to manufacturer instructions",
        "Securing furniture to walls with provided safety brackets",
        "Flattening and clearing cardboard packaging to client recycling"
      ];
    }
    if (n.includes('tv')) {
      return [
        "Wall stud detection and mounting surface assessment",
        "Precision wall bracket installation and leveling",
        "Mounting TV onto bracket and cable routing",
        "Weight stress test and screen level verification"
      ];
    }
    return [
      "Assessment of wall type (drywall, masonry, plaster)",
      "Precision drilling and heavy-duty anchor insertion",
      "Secure mounting of fixture or shelf",
      "Leveling check and cleanup of drilling dust"
    ];
  }

  // Gardening
  if (cat.includes('garden') || n.includes('lawn') || n.includes('mow') || n.includes('hedge')) {
    if (n.includes('mow') || n.includes('lawn')) {
      return [
        "Lawn perimeter edging and border trimming",
        "Uniform height lawn mowing with professional equipment",
        "Grass clippings collection and bagging",
        "Sweeping paved walkways adjacent to lawn"
      ];
    }
    return [
      "Weeding garden beds and flower borders",
      "Pruning overgrown bushes and small hedges",
      "Clearing fallen leaves and debris",
      "Bagging green waste for client garden bin"
    ];
  }

  // Moving & Packing
  if (cat.includes('mov') || cat.includes('pack') || n.includes('pack')) {
    return [
      "Careful wrapping of fragile items in bubble wrap/paper",
      "Systematic packing into sturdy moving boxes by room",
      "Clear labeling on box tops and sides",
      "Loading and secure positioning inside transport vehicle"
    ];
  }

  // Beauty & Wellness
  if (cat.includes('beauty') || n.includes('hair') || n.includes('facial') || n.includes('makeup') || n.includes('manicure')) {
    return [
      "Sanitised professional tools and disposable hygiene capes",
      "Personalised consultation prior to treatment",
      "Application of premium quality salon products",
      "Post-treatment styling/finish and mirror check"
    ];
  }

  // Pet Care
  if (cat.includes('pet') || n.includes('dog') || n.includes('cat')) {
    return [
      "Guided walk on agreed safe routes or local parks",
      "Fresh water bowl refill and paw wiping",
      "GPS tracking report or photo update upon completion",
      "Basic feeding according to owner instructions"
    ];
  }

  // Default fallback
  return [
    "Professional inspection and assessment of requirements",
    "Execution of agreed service using industry standard methods",
    "Quality and safety check post-completion",
    "Tidying of work area after service"
  ];
}

// Service specific exclusions generator
function getServiceExclusions(serviceId, name, categoryName) {
  const n = (name || '').toLowerCase();
  const cat = (categoryName || '').toLowerCase();

  if (cat.includes('chef') || cat.includes('cook') || n.includes('chef') || n.includes('cook') || n.includes('meal')) {
    return [
      "Grocery and ingredient costs unless explicitly agreed as an add-on",
      "Commercial kitchen appliance repairs",
      "Catering equipment rental (cutlery, tables, glassware)"
    ];
  }

  if (cat.includes('clean') || n.includes('clean')) {
    return [
      "Heavy structural repairs or wall repainting",
      "Pest control or fumigation services",
      "Exterior high-level window cleaning without ladder access",
      "Removal of hazardous waste or biohazard materials"
    ];
  }

  if (cat.includes('plumb') || n.includes('plumb') || n.includes('leak')) {
    return [
      "Full property main stack pipe replacement",
      "Structural excavation or wall demolition/tiling repair",
      "Council building control permits",
      "Supply of major sanitaryware fixtures (toilets, baths)"
    ];
  }

  if (cat.includes('electr') || n.includes('socket') || n.includes('light')) {
    return [
      "Full house rewire or fuse box (consumer unit) replacement",
      "Plastering or chasing deep brickwork channels",
      "Supply of expensive designer light fittings"
    ];
  }

  if (cat.includes('handyman') || cat.includes('furniture') || n.includes('assembly')) {
    return [
      "Custom carpentry modifications to furniture pieces",
      "Supply of missing manufacturer hardware or parts",
      "Disposal of old heavy furniture off-site"
    ];
  }

  if (cat.includes('garden') || n.includes('lawn')) {
    return [
      "Tree surgery for trees over 15 feet in height",
      "Hard landscaping (paving, wall building, decking installation)",
      "Commercial council waste tip fees unless green waste add-on selected"
    ];
  }

  if (cat.includes('mov') || n.includes('pack')) {
    return [
      "Transport of hazardous chemicals, gas canisters, or explosives",
      "Hoisting heavy safes or pianos without prior specialist agreement",
      "Long-term warehouse storage fees"
    ];
  }

  if (cat.includes('beauty') || n.includes('hair') || n.includes('facial')) {
    return [
      "Medical skin procedures or cosmetic injections",
      "Treatment for contagious skin or scalp conditions",
      "Hair extensions supply unless purchased separately"
    ];
  }

  if (cat.includes('pet')) {
    return [
      "Veterinary medical treatment or prescription medicine administration without signed consent",
      "Handling aggressive animals without proper harness/muzzle",
      "Overnight boarding unless pet sitting add-on selected"
    ];
  }

  return [
    "Supply of major replacement materials or expensive hardware",
    "Structural alterations or heavy demolition work",
    "Specialist permits or legal inspections"
  ];
}

// Cross-category Sensible Add-Ons Generator
function getServiceAddOns(serviceId, categoryId) {
  // Cross-category sensible add-ons referencing real service IDs from catalogue
  if (categoryId === 'cat_cooking' || serviceId.includes('cook') || serviceId.includes('meal')) {
    return [
      { serviceId: 'service_deep_cleaning', price: 15.0, requiresSeparateProvider: true },
      { serviceId: 'service_standard_cleaning', price: 20.0, requiresSeparateProvider: true },
      { serviceId: 'service_laundry_pickup_delivery', price: 10.0, requiresSeparateProvider: false }
    ];
  }

  if (categoryId === 'cat_cleaning' || serviceId.includes('clean')) {
    return [
      { serviceId: 'service_ironing', price: 12.0, requiresSeparateProvider: false },
      { serviceId: 'service_home_organization', price: 15.0, requiresSeparateProvider: false },
      { serviceId: 'service_garden_maintenance', price: 20.0, requiresSeparateProvider: true }
    ];
  }

  if (categoryId === 'cat_handyman' || serviceId.includes('furniture') || serviceId.includes('assembly') || serviceId.includes('shelf') || serviceId.includes('tv')) {
    return [
      { serviceId: 'service_shelf_install', price: 15.0, requiresSeparateProvider: false },
      { serviceId: 'service_tv_mounting', price: 25.0, requiresSeparateProvider: false },
      { serviceId: 'service_picture_mirror_hanging', price: 12.0, requiresSeparateProvider: false }
    ];
  }

  if (categoryId === 'cat_moving' || serviceId.includes('mov') || serviceId.includes('pack')) {
    return [
      { serviceId: 'service_packing_unpacking', price: 25.0, requiresSeparateProvider: false },
      { serviceId: 'service_home_organization', price: 20.0, requiresSeparateProvider: false },
      { serviceId: 'service_furniture_assembly', price: 30.0, requiresSeparateProvider: false }
    ];
  }

  if (categoryId === 'cat_gardening' || serviceId.includes('lawn') || serviceId.includes('garden')) {
    return [
      { serviceId: 'service_hedge_trim', price: 15.0, requiresSeparateProvider: false },
      { serviceId: 'service_garden_waste_removal', price: 12.0, requiresSeparateProvider: false },
      { serviceId: 'service_plant_watering', price: 10.0, requiresSeparateProvider: false }
    ];
  }

  if (categoryId === 'cat_pet_care' || serviceId.includes('dog') || serviceId.includes('pet')) {
    return [
      { serviceId: 'service_pet_sitting', price: 15.0, requiresSeparateProvider: false },
      { serviceId: 'service_plant_watering', price: 8.0, requiresSeparateProvider: false }
    ];
  }

  if (categoryId === 'cat_beauty' || serviceId.includes('hair') || serviceId.includes('makeup') || serviceId.includes('facial')) {
    return [
      { serviceId: 'service_hair_styling', price: 15.0, requiresSeparateProvider: false },
      { serviceId: 'service_facial', price: 20.0, requiresSeparateProvider: false },
      { serviceId: 'service_manicure', price: 12.0, requiresSeparateProvider: false }
    ];
  }

  if (categoryId === 'cat_plumbing' || serviceId.includes('plumb') || serviceId.includes('leak') || serviceId.includes('tap')) {
    return [
      { serviceId: 'service_tap_install', price: 15.0, requiresSeparateProvider: false },
      { serviceId: 'service_minor_plumbing_repairs', price: 20.0, requiresSeparateProvider: false }
    ];
  }

  if (categoryId === 'cat_electrical' || serviceId.includes('electr') || serviceId.includes('socket') || serviceId.includes('light')) {
    return [
      { serviceId: 'service_socket_install', price: 18.0, requiresSeparateProvider: false },
      { serviceId: 'service_light_install', price: 15.0, requiresSeparateProvider: false }
    ];
  }

  // Default cross-category add-ons
  return [
    { serviceId: 'service_standard_cleaning', price: 15.0, requiresSeparateProvider: true },
    { serviceId: 'service_home_organization', price: 12.0, requiresSeparateProvider: false }
  ];
}

async function populateAll() {
  console.log('========================================================');
  console.log('  Populating Inclusions, Exclusions & Cross Add-Ons     ');
  console.log('========================================================\n');

  // 1. Fetch all services from DB
  const res = await db.query(`
    SELECT s.id, s.name, s.category_id, c.name as category_name
    FROM services s
    LEFT JOIN categories c ON s.category_id = c.id
  `);

  console.log(`Processing ${res.rows.length} services...`);

  let count = 0;
  for (const s of res.rows) {
    const included = getServiceInclusions(s.id, s.name, s.category_name);
    const excluded = getServiceExclusions(s.id, s.name, s.category_name);
    const addons = getServiceAddOns(s.id, s.category_id);

    await db.query(
      `UPDATE services 
       SET whats_included = $1::jsonb,
           whats_not_included = $2::jsonb,
           addons = $3::jsonb
       WHERE id = $4`,
      [JSON.stringify(included), JSON.stringify(excluded), JSON.stringify(addons), s.id]
    );

    count++;
  }

  console.log(`[✓] Updated ${count} services in PostgreSQL database.\n`);

  // 2. Update server/data/categories.json as well for JSON fallback consistency
  const jsonPath = path.join(__dirname, '../data/categories.json');
  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const categoriesJson = JSON.parse(raw);

    let jsonUpdated = 0;
    for (const cat of categoriesJson) {
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          if (sub.services) {
            for (const s of sub.services) {
              s.whatsIncluded = getServiceInclusions(s.id, s.name, cat.name);
              s.includedItems = s.whatsIncluded;
              s.whatsNotIncluded = getServiceExclusions(s.id, s.name, cat.name);
              s.notIncludedItems = s.whatsNotIncluded;
              s.addons = getServiceAddOns(s.id, cat.id);
              s.availableAddOns = s.addons;
              jsonUpdated++;
            }
          }
        }
      }
    }

    fs.writeFileSync(jsonPath, JSON.stringify(categoriesJson, null, 2));
    console.log(`[✓] Updated ${jsonUpdated} services in categories.json file.`);
  }

  console.log('\n[SUCCESS] Population script complete.');
  process.exit(0);
}

populateAll().catch(err => {
  console.error('Error running population script:', err);
  process.exit(1);
});
