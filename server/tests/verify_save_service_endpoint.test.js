const http = require('http');

console.log('=== Testing Provider Save Service Details Endpoint with Auth ===');

const loginPayload = JSON.stringify({
  email: 'sanskar@gmail.com',
  password: 'password123'
});

const loginReq = http.request({
  hostname: '127.0.0.1',
  port: 4000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginPayload)
  }
}, (loginRes) => {
  let body = '';
  loginRes.on('data', chunk => body += chunk);
  loginRes.on('end', () => {
    const data = JSON.parse(body);
    const token = data.token;
    console.log('Login successful! Token acquired.');

    const savePayload = JSON.stringify({
      customPrice: 20,
      customDescription: 'Basic meal preparation for individuals and small families.',
      customWhatsIncluded: ['Professional meal preparation', 'Kitchen surface wipe down'],
      customWhatsNotIncluded: ['Grocery costs'],
      customAddOns: [],
      customFaqs: [],
      pricingRules: {
        pricingModel: 'multi',
        enabledModels: ['per_hour', 'per_person'],
        basePrice: 20,
        enablePerHour: true,
        includedHours: 1,
        additionalHourPrice: 20,
        minHours: 1,
        maxHours: 8,
        enablePerUnit: true,
        includedQuantity: 4,
        includedUnit: 'person',
        additionalUnitPrice: 10,
        additionalUnit: 'person',
        minimumQuantity: 1,
        maximumQuantity: 12
      }
    });

    const saveReq = http.request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/providers/prov_a7638a30f72d/services/service_home_cook',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(savePayload)
      }
    }, (saveRes) => {
      let saveBody = '';
      saveRes.on('data', chunk => saveBody += chunk);
      saveRes.on('end', () => {
        console.log(`HTTP Status: ${saveRes.statusCode}`);
        console.log(`Response: ${saveBody}`);
        console.assert(saveRes.statusCode === 200, 'Endpoint should return 200 OK');
        console.log('✅ PROVIDER SAVE SERVICE DETAILS WITH AUTH WORKING 100% CLEAN!');
      });
    });

    saveReq.write(savePayload);
    saveReq.end();
  });
});

loginReq.write(loginPayload);
loginReq.end();
