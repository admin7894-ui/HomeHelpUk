const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

// Service specific template generator
function getEnrichedServiceData(srv, catName) {
  const name = srv.name;
  const id = srv.id;
  const unit = srv.unit || 'visit';
  const price = Number(srv.price) || 25;

  let whatsIncluded = srv.whatsIncluded && Array.isArray(srv.whatsIncluded) && srv.whatsIncluded.length > 0 ? srv.whatsIncluded : [];
  let whatsNotIncluded = srv.whatsNotIncluded && Array.isArray(srv.whatsNotIncluded) && srv.whatsNotIncluded.length > 0 ? srv.whatsNotIncluded : [];
  let customAddOns = srv.customAddOns || srv.addOns || srv.addons || [];
  let faqs = srv.faqs && Array.isArray(srv.faqs) && srv.faqs.length > 0 ? srv.faqs : [];

  // Helper for generating category-specific defaults
  if (whatsIncluded.length === 0) {
    if (srv.baseIncludes) {
      whatsIncluded.push(srv.baseIncludes);
    }
    if (catName === 'Cooking') {
      whatsIncluded.push(
        `Professional preparation of ${name.toLowerCase()}`,
        `Fresh ingredient handling and hygiene compliance`,
        `Customization according to agreed dietary requirements`,
        `Kitchen surface wipe down after cooking`
      );
    } else if (catName === 'Cleaning') {
      whatsIncluded.push(
        `Comprehensive ${name.toLowerCase()} execution`,
        `Sanitization of key touchpoints and high-traffic areas`,
        `Use of eco-friendly and effective cleaning supplies`,
        `Final quality inspection check`
      );
    } else if (catName === 'Plumbing') {
      whatsIncluded.push(
        `Initial diagnostic inspection for ${name.toLowerCase()}`,
        `Professional repair or installation using standard tools`,
        `Pressure check and leak testing post-completion`,
        `Cleanup of immediate work space`
      );
    } else if (catName === 'Electrical') {
      whatsIncluded.push(
        `Safety isolation and electrical circuit testing`,
        `Secure fitting and wiring for ${name.toLowerCase()}`,
        `Operation validation and safety check`,
        `Disposal of standard wiring debris`
      );
    } else if (catName === 'Handyman') {
      whatsIncluded.push(
        `Assessment and measurement of work area`,
        `Precision assembly and secure mounting`,
        `Heavy-duty anchor fixture placement`,
        `Debris cleanup and packaging removal`
      );
    } else if (catName === 'Painting') {
      whatsIncluded.push(
        `Surface prep, sanding, and filling of minor cracks`,
        `Protection of floors and furniture with drop cloths`,
        `Application of premium quality paint coats`,
        `Clean edge trimming and final touch-up`
      );
    } else if (catName === 'Gardening') {
      whatsIncluded.push(
        `Trimming, shaping, and clearing of target garden area`,
        `Edge cleanup along borders and walkways`,
        `Basic health check of surrounding foliage`,
        `Neat sweeping of pathways`
      );
    } else if (catName === 'Laundry' || catName === 'Moving' || catName === 'Home Services') {
      whatsIncluded.push(
        `Careful handling of items and personal belongings`,
        `Tailored service execution per instructions`,
        `Systematic sorting and arrangement`,
        `Final review before completion`
      );
    } else if (catName === 'Pet Care') {
      whatsIncluded.push(
        `Attentive care and activity tailored to your pet`,
        `Fresh water check and feeding as requested`,
        `Safety check during walk or visit`,
        `Photo/GPS update upon completion`
      );
    } else if (catName === 'Beauty' || catName === 'Care Services' || catName === 'Childcare') {
      whatsIncluded.push(
        `Personalized consultation before starting`,
        `Professional service delivered at your home`,
        `High hygienic standard and sanitized equipment`,
        `Customized attention for individual comfort`
      );
    } else {
      whatsIncluded.push(
        `Initial consultation and scope review`,
        `Professional execution of ${name.toLowerCase()}`,
        `Quality inspection and testing`,
        `Clean up of work site`
      );
    }
  }

  if (whatsNotIncluded.length === 0) {
    if (catName === 'Cooking') {
      whatsNotIncluded = [
        'Grocery costs (unless explicitly agreed or added as an add-on)',
        'Major commercial kitchen appliance repair',
        'Catering equipment rental'
      ];
    } else if (catName === 'Cleaning') {
      whatsNotIncluded = [
        'Removal of hazardous or biohazard waste',
        'Exterior roof or high-ladder window cleaning',
        'Pest control or extermination treatments'
      ];
    } else if (catName === 'Plumbing') {
      whatsNotIncluded = [
        'Replacement of main underground sewer pipes',
        'Structural wall or tile restoration after access',
        'Emergency boiler overhaul without part replacement'
      ];
    } else if (catName === 'Electrical') {
      whatsNotIncluded = [
        'Main distribution board upgrade unless specified',
        'Plastering or wall re-decorating after chasing',
        'Utility meter upgrades'
      ];
    } else if (catName === 'Handyman' || catName === 'Painting') {
      whatsNotIncluded = [
        'Structural wall or ceiling beam modification',
        'Scaffolding erection for multi-story exteriors',
        'Supply of high-end specialized designer fixtures'
      ];
    } else if (catName === 'Gardening') {
      whatsNotIncluded = [
        'Large tree felling above 15 feet',
        'Heavy excavation or hard landscaping construction',
        'Chemical weed spraying without prior consent'
      ];
    } else if (catName === 'Pet Care' || catName === 'Childcare' || catName === 'Care Services') {
      whatsNotIncluded = [
        'Veterinary or medical prescriptions',
        'Overnight stays unless booked under overnight option',
        'Transport outside agreed local service radius'
      ];
    } else {
      whatsNotIncluded = [
        'Unrelated major household repairs',
        'Supply of heavy commercial machinery',
        'Emergency calls outside standard booked hours'
      ];
    }
  }

  if (customAddOns.length === 0) {
    if (catName === 'Cooking') {
      customAddOns = [
        { id: `${id}_addon_extra_meal`, name: 'Extra Meal / Portion', description: 'Prepare 2 additional portions', price: Math.round(price * 0.35), enabled: true },
        { id: `${id}_addon_groceries`, name: 'Grocery Pickup Service', description: 'Provider buys and brings agreed ingredients', price: 15, enabled: true },
        { id: `${id}_addon_menu_plan`, name: 'Customized Dietary Plan', description: 'Tailored weekly nutrition menu plan', price: 10, enabled: true }
      ];
    } else if (catName === 'Cleaning') {
      customAddOns = [
        { id: `${id}_addon_oven`, name: 'Inside Oven Deep Clean', description: 'Remove burnt grease & grime', price: 25, enabled: true },
        { id: `${id}_addon_fridge`, name: 'Inside Refrigerator Clean', description: 'Sanitize shelves and drawers', price: 15, enabled: true },
        { id: `${id}_addon_windows`, name: 'Interior Windows', description: 'Clean inside glass & sills', price: 20, enabled: true }
      ];
    } else if (catName === 'Plumbing') {
      customAddOns = [
        { id: `${id}_addon_part_fetch`, name: 'Parts Sourcing Trip', description: 'Travel to merchant for specialized part', price: 20, enabled: true },
        { id: `${id}_addon_secondary_check`, name: 'Secondary Pipe Inspection', description: 'Check adjacent drain/pipe lines', price: 25, enabled: true }
      ];
    } else if (catName === 'Electrical') {
      customAddOns = [
        { id: `${id}_addon_extra_point`, name: 'Extra Light/Socket Fitting', description: 'Install one additional point during visit', price: 25, enabled: true },
        { id: `${id}_addon_surge_check`, name: 'Surge Protection Audit', description: 'Inspect consumer unit safety', price: 20, enabled: true }
      ];
    } else if (catName === 'Handyman' || catName === 'Painting') {
      customAddOns = [
        { id: `${id}_addon_heavy_anchor`, name: 'Heavy Duty Wall Anchor Set', description: 'High-weight anchors for masonry/drywall', price: 10, enabled: true },
        { id: `${id}_addon_extra_hour`, name: 'Extra 30 Mins Labor', description: 'Additional handyman working time', price: 20, enabled: true }
      ];
    } else if (catName === 'Gardening') {
      customAddOns = [
        { id: `${id}_addon_waste_bag`, name: 'Extra Green Waste Removal', description: 'Dispose of 2 extra large garden bags', price: 15, enabled: true },
        { id: `${id}_addon_weed_treat`, name: 'Lawn Weed & Feed Treatment', description: 'Apply eco-friendly fertilizer', price: 20, enabled: true }
      ];
    } else if (catName === 'Beauty') {
      customAddOns = [
        { id: `${id}_addon_deep_treat`, name: 'Nourishing Hair/Skin Mask', description: 'Deep conditioning treatment', price: 15, enabled: true },
        { id: `${id}_addon_express_styling`, name: 'Express Blow-dry / Finish', description: 'Quick styling finish after treatment', price: 20, enabled: true }
      ];
    } else {
      customAddOns = [
        { id: `${id}_addon_express`, name: 'Priority / Same Day Scheduling', description: 'Fast-track appointment confirmation', price: 15, enabled: true },
        { id: `${id}_addon_extra_time`, name: 'Extended Service Time (30 mins)', description: 'Additional dedicated working time', price: 20, enabled: true }
      ];
    }
  }

  if (faqs.length === 0) {
    if (catName === 'Cooking') {
      faqs = [
        { q: 'Do I need to provide the ingredients and groceries?', a: 'By default, groceries are provided by the client. You can also select the Grocery Pickup add-on to have your provider purchase ingredients before arriving.' },
        { q: 'Can meals be stored for multiple days?', a: 'Yes! Your provider will safely package and label prepared meals for refrigeration or freezing per your instructions.' },
        { q: 'Can I request specific dietary requirements?', a: 'Absolutely. You can specify any allergies, vegetarian, vegan, halal, gluten-free, or low-sodium preferences when booking.' }
      ];
    } else if (catName === 'Cleaning') {
      faqs = [
        { q: 'Does the cleaner bring their own supplies and equipment?', a: 'Yes, all standard cleaning detergents, microfibers, mop, and vacuum cleaner are provided by your professional cleaner.' },
        { q: 'Do I need to be home during the cleaning service?', a: 'It is your choice! You can meet the cleaner to let them in, or provide access instructions via secure key drop.' },
        { q: 'What happens if I need to cancel or reschedule?', a: 'You can reschedule or cancel free of charge up to 24 hours prior to the scheduled booking start time.' }
      ];
    } else if (catName === 'Plumbing') {
      faqs = [
        { q: 'Are replacement parts included in the base price?', a: 'Base prices cover labor and standard consumables (seals, tape). Replacement hardware taps, valves, or pipes are billed transparently.' },
        { q: 'Will I receive an upfront estimate before work starts?', a: 'Yes, your provider will inspect the work area and confirm all costs with you before starting any major repair.' }
      ];
    } else if (catName === 'Electrical') {
      faqs = [
        { q: 'Is the technician fully certified and insured?', a: 'Yes, all electrical service providers on HomeHelpUK hold certified qualifications and public liability insurance.' },
        { q: 'Do I need to turn off the main power supply before they arrive?', a: 'No, your technician will perform safety isolation on the relevant circuit breaker upon arrival.' }
      ];
    } else {
      faqs = [
        { q: 'How is the service price calculated?', a: 'The service features a clear base price covering standard inclusions, with options to customize add-ons or extra duration.' },
        { q: 'Can I message the provider before the appointment?', a: 'Yes! Once your booking is confirmed, you can chat directly with your provider in the app.' }
      ];
    }
  }

  const pricingRules = srv.pricingRules || {
    basePrice: price,
    includedQuantity: srv.maxQuantity ? 1 : (srv.baseIncludes && srv.baseIncludes.includes('person') ? 2 : 1),
    additionalUnitPrice: srv.additionalCharge || (unit === 'hr' ? price : 10),
    unitType: unit === 'hr' ? 'hour' : (unit === 'visit' ? 'visit' : 'item'),
    pricingType: unit === 'hr' ? 'hourly' : (srv.additionalCharge ? 'per_unit' : 'fixed'),
    maxQuantity: srv.maxQuantity || 10
  };

  return {
    ...srv,
    whatsIncluded,
    whatsNotIncluded,
    customAddOns,
    faqs,
    pricingRules
  };
}

// Process categories
let totalCount = 0;
categories.forEach(cat => {
  if (cat.subcategories) {
    cat.subcategories.forEach(sub => {
      if (sub.services) {
        sub.services = sub.services.map(srv => {
          totalCount++;
          return getEnrichedServiceData(srv, cat.name);
        });
      }
    });
  }
});

fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8');
console.log(`Enriched ${totalCount} services in categories.json successfully!`);
