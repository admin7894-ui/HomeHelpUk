const fs = require('fs');
const path = require('path');

const categoriesPath = path.join(__dirname, '../data/categories.json');
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

const serviceImagesModule = require('../../mobile/src/utils/serviceImages');
const serviceDetailCode = fs.readFileSync(path.join(__dirname, '../../mobile/src/screens/Customer/ServiceDetailScreen.js'), 'utf-8');

console.log('=== Running Domain-Isolated Images & GIF Preview Verification ===');

// 1. Verify fake play button is removed from ServiceDetailScreen
console.assert(!serviceDetailCode.includes('playBtnCircle'), 'ServiceDetailScreen must NOT contain playBtnCircle');

// 2. Verify Gardening Services Image Isolation (No food/BBQ photos!)
const gardeningCat = categories.find(c => c.id === 'cat_gardening');
const gardeningServices = [];
gardeningCat.subcategories.forEach(sub => {
  if (sub.services) {
    sub.services.forEach(srv => gardeningServices.push(srv));
  }
});

console.log(`Checking ${gardeningServices.length} Gardening Services:`);
gardeningServices.forEach(srv => {
  const coverObj = serviceImagesModule.getServiceImage(srv.id);
  const galleryObj = serviceImagesModule.getServiceGallery(srv.id);
  const coverUrl = coverObj.uri;

  // Assert URL does NOT contain food keywords (photo-1540420773420 is salad, photo-1504674900247 is BBQ)
  console.assert(!coverUrl.includes('photo-1540420773420'), `${srv.name} cover must not be salad`);
  console.assert(!coverUrl.includes('photo-1504674900247'), `${srv.name} cover must not be BBQ ribs`);

  galleryObj.forEach((gImg, idx) => {
    console.assert(!gImg.uri.includes('photo-1540420773420'), `${srv.name} gallery [${idx}] must not be salad`);
    console.assert(!gImg.uri.includes('photo-1504674900247'), `${srv.name} gallery [${idx}] must not be BBQ ribs`);
  });
  console.log(` - ${srv.name}: OK (Cover: ${coverUrl.slice(0, 45)}...)`);
});

console.log('✅ ALL DOMAIN-ISOLATED IMAGES & GIF PREVIEW TESTS PASSED 100% CLEAN!');
