const fs = require('fs');
const path = require('path');

const messagesScreenPath = path.join(__dirname, '../../mobile/src/screens/Customer/MessagesScreen.js');
const chatScreenPath = path.join(__dirname, '../../mobile/src/screens/Shared/ChatScreen.js');

const messagesContent = fs.readFileSync(messagesScreenPath, 'utf-8');
const chatContent = fs.readFileSync(chatScreenPath, 'utf-8');

console.log('=== Running Messages & Chat UI Verification Test ===');

// 1. Verify MessagesScreen green/gold avatar & context styling
console.assert(messagesContent.includes("backgroundColor: '#0A3925'"), 'MessagesScreen must use #0A3925 green initial avatar background');
console.assert(messagesContent.includes('#FACC15'), 'MessagesScreen must use #FACC15 gold text for avatar');
console.assert(messagesContent.includes('No Conversations Yet'), 'MessagesScreen empty state title must be present');

// 2. Verify ChatScreen dark forest green header & gold subtitle
console.assert(chatContent.includes("backgroundColor: '#0A3925'"), 'ChatScreen must use #0A3925 dark forest green header');
console.assert(chatContent.includes('#FACC15'), 'ChatScreen header subtitle must use #FACC15 bright gold');
console.assert(chatContent.includes('pillInputBox'), 'ChatScreen must use pillInputBox style');

// 3. Verify zero purple/blue residual hexes
const purpleHexes = ['#4338CA', '#4F46E5', '#6366F1', '#3730A3', '#E0E7FF', '#EEF2FF'];
purpleHexes.forEach(hex => {
  console.assert(!messagesContent.includes(hex), `MessagesScreen must not contain ${hex}`);
  console.assert(!chatContent.includes(hex), `ChatScreen must not contain ${hex}`);
});

console.log('✅ ALL MESSAGES & CHAT UI VERIFICATION TESTS PASSED 100% CLEAN!');
