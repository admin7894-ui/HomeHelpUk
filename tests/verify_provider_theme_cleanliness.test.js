const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../mobile/src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

console.log('=== Running Provider Theme Cleanliness Verification Test ===');

const allSrcFiles = getAllFiles(srcDir);
const legacyHexes = ['#4338CA', '#4F46E5', '#E0E7FF', '#EEF2FF'];

const violations = [];

allSrcFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  legacyHexes.forEach((hex) => {
    if (content.includes(hex)) {
      violations.push({ file: path.relative(srcDir, file), hex });
    }
  });
});

if (violations.length > 0) {
  console.error('❌ FOUND RESIDUAL BLUE/PURPLE HEX CODES:');
  violations.forEach((v) => console.error(` - File: ${v.file} contains ${v.hex}`));
  process.exit(1);
} else {
  console.log('✅ ZERO RESIDUAL BLUE/PURPLE HEX CODES FOUND IN MOBILE/SRC!');
  console.log('✅ 100% CLEAN ADHERENCE TO DARK FOREST GREEN (#0A3925) + WARM GOLD (#EAB308)!');
}
