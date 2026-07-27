const fs = require('fs');
const { resolveUnitConfig } = require('../mobile/src/utils/serviceConfig');

const catPath = 'c:\\Users\\v2spl\\Downloads\\HomeHelpUK-POC\\HomeHelpUK\\server\\data\\categories.json';
const categories = JSON.parse(fs.readFileSync(catPath, 'utf8'));

console.log('=== AUDITING QUANTITY CONFIGS FOR ALL 68 ACTIVE SERVICES ===\n');

const allServices = [];

categories.forEach(cat => {
  (cat.subcategories || []).forEach(sub => {
    (sub.services || []).forEach(srv => {
      if (srv.isActive !== false) {
        allServices.push({ cat, sub, srv });
      }
    });
  });
});

let genericFallbackCount = 0;

allServices.forEach(({ cat, sub, srv }) => {
  const config = resolveUnitConfig(srv, cat);
  const isGeneric = config.sectionTitle === 'Select Quantity' || config.unitLabel === 'Item';
  
  if (isGeneric && !['service_furniture_assembly', 'service_picture_mirror_hanging', 'service_sofa', 'service_ironing'].includes(srv.id)) {
    console.log(`❌ GENERIC FALLBACK: [${cat.id}] ${srv.id} ("${srv.name}") -> title="${config.sectionTitle}", unit="${config.unitLabel}"`);
    genericFallbackCount++;
  } else {
    console.log(`✅ SPECIFIC: [${cat.id}] ${srv.id} -> title="${config.sectionTitle}", unit="${config.unitLabel}/${config.unitLabelPlural}"`);
  }
});

console.log(`\nTotal Generic Fallbacks Found: ${genericFallbackCount}`);
