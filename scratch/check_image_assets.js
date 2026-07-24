const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '../mobile/assets/images/services');

console.log('=== CHECKING PHYSICAL SERVICE IMAGE ASSETS ===');
if (!fs.existsSync(servicesDir)) {
  console.log(`Directory does NOT exist: ${servicesDir}`);
} else {
  const files = fs.readdirSync(servicesDir);
  console.log(`Found ${files.length} files in ${servicesDir}:`);
  files.forEach(f => console.log(` - ${f} (size: ${fs.statSync(path.join(servicesDir, f)).size} bytes)`));
}
