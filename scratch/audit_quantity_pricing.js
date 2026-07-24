const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../server/data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

let totalServices = 0;
const auditResults = [];

categories.forEach(cat => {
  (cat.subcategories || []).forEach(sub => {
    (sub.services || []).forEach(srv => {
      totalServices++;
      const pRules = srv.pricingRules || {};
      const model = pRules.pricingModel || (srv.unit === 'hr' ? 'per_hour' : 'fixed');
      const baseIncludes = srv.baseIncludes || pRules.baseIncludes || '';
      const unit = srv.unit || pRules.includedUnit || 'visit';

      // Quantity Unit Detection
      let qtyType = 'None / Fixed';
      let requiresQtySelector = false;

      const baseStr = (baseIncludes + ' ' + unit + ' ' + (pRules.includedUnit || '')).toLowerCase();

      if (baseStr.match(/person|people|guest|diner|member/)) {
        qtyType = 'Person';
        requiresQtySelector = true;
      } else if (baseStr.match(/room|bedroom|bathroom/)) {
        qtyType = 'Room';
        requiresQtySelector = true;
      } else if (baseStr.match(/pet|dog|cat/)) {
        qtyType = 'Pet';
        requiresQtySelector = true;
      } else if (baseStr.match(/vehicle|car|van/)) {
        qtyType = 'Vehicle';
        requiresQtySelector = true;
      } else if (baseStr.match(/appliance|item|window|radiator|socket|light|outlet|fixture|door|unit|portion|meal/)) {
        qtyType = 'Unit / Item';
        requiresQtySelector = true;
      } else if (model === 'per_person' || pRules.enabledModels?.includes('per_person')) {
        qtyType = 'Person';
        requiresQtySelector = true;
      } else if (model === 'per_unit' || pRules.enabledModels?.includes('per_unit')) {
        qtyType = 'Unit';
        requiresQtySelector = true;
      }

      // Check current customer-side visibility status
      // On ServiceDetailScreen.js: quantity state exists but stepper UI is 100% missing!
      // On BookDateTimeScreen.js: quantity state exists but stepper UI is 100% missing!
      const isVisibleToCustomer = false; // Currently missing across customer flow
      const canCustomerChangeQty = false;
      const pricingUpdates = false;
      const checkoutDisplays = false;

      auditResults.push({
        serviceId: srv.id,
        serviceName: srv.name,
        category: cat.name,
        pricingModel: model,
        enabledModels: pRules.enabledModels || [model],
        quantityType: qtyType,
        requiresQtySelector,
        providerConfigured: {
          basePrice: srv.price || pRules.basePrice,
          includedQuantity: pRules.includedQuantity || 1,
          additionalUnitPrice: srv.additionalCharge || pRules.additionalUnitPrice || 0,
          minQty: pRules.minimumQuantity || 1,
          maxQty: srv.maxQuantity || pRules.maximumQuantity || 10,
          baseIncludes: baseIncludes
        },
        customerSideStatus: {
          isVisible: isVisibleToCustomer,
          canChange: canCustomerChangeQty,
          pricingUpdates,
          checkoutDisplays,
          issue: requiresQtySelector ? 'MISSING_QUANTITY_SELECTOR' : 'N/A (Fixed/Hourly without quantity)'
        }
      });
    });
  });
});

console.log(`Total Services Audited: ${totalServices}`);
console.log(`Services Requiring Quantity Selector: ${auditResults.filter(r => r.requiresQtySelector).length}`);
console.log(`Services Working Correctly: 0 (Stepper missing across customer screens)`);

fs.writeFileSync(path.join(__dirname, 'audit_report.json'), JSON.stringify(auditResults, null, 2));
console.log('Audit results saved to audit_report.json');
