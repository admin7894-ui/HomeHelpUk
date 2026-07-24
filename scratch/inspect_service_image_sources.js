const fs = require('fs');
const path = require('path');

const catDetailPath = path.join(__dirname, '../mobile/src/screens/Customer/CategoryDetailScreen.js');
const homePath = path.join(__dirname, '../mobile/src/screens/Customer/HomeScreen.js');
const serviceDetailPath = path.join(__dirname, '../mobile/src/screens/Customer/ServiceDetailScreen.js');

console.log('=== INSPECTING IMAGE RENDERING LOGIC ===');
console.log('CategoryDetailScreen snippet:');
const catCode = fs.readFileSync(catDetailPath, 'utf-8');
console.log(catCode.slice(catCode.indexOf('getServiceImage'), catCode.indexOf('getServiceImage') + 300));
