const fs = require('fs');

const catPath = 'c:\\Users\\v2spl\\Downloads\\HomeHelpUK-POC\\HomeHelpUK\\server\\data\\categories.json';
const categories = JSON.parse(fs.readFileSync(catPath, 'utf8'));

const allServices = [];

categories.forEach(cat => {
  (cat.subcategories || []).forEach(sub => {
    (sub.services || []).forEach(srv => {
      if (srv.isActive !== false) {
        allServices.push({
          catId: cat.id,
          catName: cat.name,
          subId: sub.id,
          subName: sub.name,
          srvId: srv.id,
          srvName: srv.name
        });
      }
    });
  });
});

console.log(`Total active services in categories.json: ${allServices.length}\n`);
allServices.forEach(s => {
  console.log(`[${s.catId}] ${s.srvId} -> "${s.srvName}"`);
});
