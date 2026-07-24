const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../server/data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

console.log('=== COMPLETE APP IMAGE INVENTORY AUDIT ===');
console.log(`Total Categories: ${categories.length}`);

let totalServicesCount = 0;
let totalCoverImagesRequired = categories.length; // 1 per category
let totalGalleryImagesRequired = 0;

const inventory = [];

categories.forEach((cat) => {
  const catData = {
    id: cat.id,
    name: cat.name,
    coverSlot: 1,
    subcategoriesCount: cat.subcategories ? cat.subcategories.length : 0,
    services: []
  };

  if (cat.subcategories) {
    cat.subcategories.forEach((sub) => {
      if (sub.services) {
        sub.services.forEach((srv) => {
          totalServicesCount++;
          totalCoverImagesRequired++; // 1 cover per service
          totalGalleryImagesRequired += 4; // 4 gallery images per service

          catData.services.push({
            id: srv.id,
            name: srv.name,
            subcategoryId: sub.id,
            subcategoryName: sub.name,
            coverSlot: 1,
            gallerySlots: 4
          });
        });
      }
    });
  }

  inventory.push(catData);
});

console.log(`Total Individual Services: ${totalServicesCount}`);
console.log(`Total Unique Category Cover Images Required: ${categories.length}`);
console.log(`Total Unique Service Cover Images Required: ${totalServicesCount}`);
console.log(`Total Unique Service Gallery Images Required: ${totalGalleryImagesRequired}`);
console.log(`TOTAL UNIQUE ASSET SLOTS REQUIRED: ${categories.length + totalServicesCount + totalGalleryImagesRequired}`);

fs.writeFileSync(
  path.join(__dirname, '../scratch/inventory_dump.json'),
  JSON.stringify(inventory, null, 2)
);
console.log('Saved inventory dump to scratch/inventory_dump.json');
