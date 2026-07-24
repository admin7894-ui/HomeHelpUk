const fs = require('fs');
const path = require('path');

const auditReport = JSON.parse(fs.readFileSync(path.join(__dirname, 'audit_report.json'), 'utf-8'));

const byCategory = {};
const byQtyType = {};
let missingCount = 0;
let notRequiredCount = 0;

auditReport.forEach(item => {
  if (!byCategory[item.category]) {
    byCategory[item.category] = { total: 0, missing: 0, notRequired: 0, services: [] };
  }
  byCategory[item.category].total++;
  if (item.requiresQtySelector) {
    byCategory[item.category].missing++;
    missingCount++;
  } else {
    byCategory[item.category].notRequired++;
    notRequiredCount++;
  }
  byCategory[item.category].services.push(item);

  if (!byQtyType[item.quantityType]) {
    byQtyType[item.quantityType] = 0;
  }
  byQtyType[item.quantityType]++;
});

console.log('=== AUDIT SUMMARY ===');
console.log(`Total Services Audited: ${auditReport.length}`);
console.log(`Services Requiring Quantity Selector (Currently Missing): ${missingCount}`);
console.log(`Services Not Requiring Quantity Selector (Fixed/Hourly Flat Fee): ${notRequiredCount}`);
console.log('\nBreakdown by Quantity Type:', byQtyType);
console.log('\nBreakdown by Category:');
Object.keys(byCategory).forEach(cat => {
  console.log(`- ${cat}: Total ${byCategory[cat].total} | Missing Stepper: ${byCategory[cat].missing} | Fixed/Flat: ${byCategory[cat].notRequired}`);
});
