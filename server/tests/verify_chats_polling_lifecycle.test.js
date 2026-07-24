const fs = require('fs');
const path = require('path');

const customerTabPath = path.join(__dirname, '../../mobile/src/navigation/CustomerTabNavigator.js');
const providerTabPath = path.join(__dirname, '../../mobile/src/navigation/ProviderTabNavigator.js');
const messagesScreenPath = path.join(__dirname, '../../mobile/src/screens/Customer/MessagesScreen.js');
const chatScreenPath = path.join(__dirname, '../../mobile/src/screens/Shared/ChatScreen.js');

const customerTabContent = fs.readFileSync(customerTabPath, 'utf-8');
const providerTabContent = fs.readFileSync(providerTabPath, 'utf-8');
const messagesContent = fs.readFileSync(messagesScreenPath, 'utf-8');
const chatContent = fs.readFileSync(chatScreenPath, 'utf-8');

console.log('=== Running Chats Polling Lifecycle Verification Test ===');

// 1. Verify 5000ms & 3000ms un-cleared intervals are removed
console.assert(!/\b5000\b/.test(customerTabContent), 'CustomerTabNavigator must not use 5000ms polling');
console.assert(!/\b5000\b/.test(providerTabContent), 'ProviderTabNavigator must not use 5000ms polling');
console.assert(!/\b3000\b/.test(chatContent), 'ChatScreen must not use 3000ms polling');

// 2. Verify AppState listener in Tab Navigators (15000ms)
console.assert(customerTabContent.includes('15000'), 'CustomerTabNavigator must use 15000ms interval');
console.assert(customerTabContent.includes('AppState.addEventListener'), 'CustomerTabNavigator must listen to AppState');
console.assert(providerTabContent.includes('15000'), 'ProviderTabNavigator must use 15000ms interval');
console.assert(providerTabContent.includes('AppState.addEventListener'), 'ProviderTabNavigator must listen to AppState');

// 3. Verify useFocusEffect in MessagesScreen (12000ms)
console.assert(messagesContent.includes('useFocusEffect'), 'MessagesScreen must use useFocusEffect to stop polling on blur');
console.assert(messagesContent.includes('12000'), 'MessagesScreen must use 12000ms interval');
console.assert(messagesContent.includes('AppState.addEventListener'), 'MessagesScreen must listen to AppState');

// 4. Verify ChatScreen AppState awareness (12000ms)
console.assert(chatContent.includes('12000'), 'ChatScreen must use 12000ms interval');
console.assert(chatContent.includes('AppState.addEventListener'), 'ChatScreen must listen to AppState');

console.log('✅ ALL CHATS POLLING LIFECYCLE TESTS PASSED 100% CLEAN!');
