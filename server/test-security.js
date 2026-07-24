const http = require('http');

async function testApi(method, path, body = null, token = null) {
  const options = {
    hostname: 'localhost',
    port: 4000,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING SECURITY & E2E TESTS ---');
  let customerAToken, customerBToken, providerAToken, providerBToken;
  let customerAId, customerBId, providerAId, providerBId;
  let providerA_ProviderId;

  const rnd = Math.floor(Math.random() * 100000);
  const cA = await testApi('POST', '/api/auth/register', { name: 'Customer A', email: `ca${rnd}@test.com`, password: 'pass', role: 'customer' });
  if (!cA.data.user) { console.log('Reg failed:', cA); return; }
  customerAToken = cA.data.token; customerAId = cA.data.user.id;
  
  const cB = await testApi('POST', '/api/auth/register', { name: 'Customer B', email: `cb${rnd}@test.com`, password: 'pass', role: 'customer' });
  customerBToken = cB.data.token; customerBId = cB.data.user.id;
  
  const pA = await testApi('POST', '/api/auth/register', { name: 'Provider A', email: `pa${rnd}@test.com`, password: 'pass', role: 'provider' });
  providerAToken = pA.data.token; providerAId = pA.data.user.id; providerA_ProviderId = pA.data.user.providerId;

  const pB = await testApi('POST', '/api/auth/register', { name: 'Provider B', email: `pb${rnd}@test.com`, password: 'pass', role: 'provider' });
  providerBToken = pB.data.token; providerBId = pB.data.user.id;

  const forged = await testApi('GET', '/api/profile/fake', null, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature');
  console.log(`Forged JWT: ${forged.status === 401 ? 'PASS' : 'FAIL'} (${forged.status})`);

  const idor = await testApi('POST', `/api/profile/${customerBId}/favourites`, { providerId: 'prov_x' }, customerAToken);
  console.log(`IDOR Profile Modify: ${idor.status === 403 ? 'PASS' : 'FAIL'} (${idor.status})`);

  const b1 = await testApi('POST', '/api/bookings', {
    customerId: customerAId,
    providerId: 'open',
    categoryId: 'cat_cleaning',
    date: '2026-08-01', time: '10:00', address: '123 Test', durationHours: 2
  }, customerAToken);
  if (!b1.data.booking) {
    console.log('Booking creation failed:', b1);
    return;
  }
  const bookingId = b1.data.booking.id;
  
  const b1GetAsProvider = await testApi('GET', `/api/bookings/${bookingId}`, null, providerAToken);
  const providerCanSeeOtp = b1GetAsProvider.data.booking && (b1GetAsProvider.data.booking.startOtp || b1GetAsProvider.data.booking.completionOtp);
  console.log(`OTPs Hidden from Provider: ${providerCanSeeOtp ? 'FAIL' : 'PASS'}`);
  
  const b1GetAsCB = await testApi('GET', `/api/bookings/${bookingId}`, null, customerBToken);
  console.log(`Customer B accessing Customer A booking: ${b1GetAsCB.status === 403 ? 'PASS' : 'FAIL'} (${b1GetAsCB.status})`);

  const chatAuth1 = await testApi('GET', `/api/chats/${bookingId}`, null, customerBToken);
  console.log(`Chat access by unrelated Customer B: ${chatAuth1.status === 403 ? 'PASS' : 'FAIL'} (${chatAuth1.status})`);

  const fs = require('fs');
  const path = require('path');
  const provPath = path.join(__dirname, 'data/providers.json');
  const provs = JSON.parse(fs.readFileSync(provPath, 'utf8'));
  const pAData = provs.find(p => p.id === providerA_ProviderId);
  pAData.categories = ['cat_cleaning'];
  pAData.bankDetails = { accountHolder: 'Provider A', sortCode: '123456', accountNumber: '12345678' };
  fs.writeFileSync(provPath, JSON.stringify(provs, null, 2));

  const accept = await testApi('PATCH', `/api/bookings/${bookingId}/status`, { status: 'assigned' }, providerAToken);
  console.log(`Provider Assignment: ${accept.status === 200 ? 'PASS' : 'FAIL'} (${accept.status})`);

  const acceptB = await testApi('PATCH', `/api/bookings/${bookingId}/status`, { status: 'assigned' }, providerBToken);
  console.log(`Double Claiming Prevented: ${acceptB.status === 400 || acceptB.status === 403 ? 'PASS' : 'FAIL'} (${acceptB.status})`);

  const startFail = await testApi('PATCH', `/api/bookings/${bookingId}/status`, { status: 'in_progress', startOtp: '9999' }, providerAToken);
  console.log(`Invalid Start OTP Rejected: ${startFail.status === 400 ? 'PASS' : 'FAIL'} (${startFail.status})`);

  const b1GetAsCA = await testApi('GET', `/api/bookings/${bookingId}`, null, customerAToken);
  const startOtp = b1GetAsCA.data.booking.startOtp;
  const compOtp = b1GetAsCA.data.booking.completionOtp;

  const startSuccess = await testApi('PATCH', `/api/bookings/${bookingId}/status`, { status: 'in_progress', startOtp: startOtp }, providerAToken);
  console.log(`Valid Start OTP Accepted: ${startSuccess.status === 200 ? 'PASS' : 'FAIL'} (${startSuccess.status})`);

  const compFail = await testApi('PATCH', `/api/bookings/${bookingId}/status`, { status: 'completed', completionOtp: '9999' }, providerAToken);
  console.log(`Invalid Comp OTP Rejected: ${compFail.status === 400 ? 'PASS' : 'FAIL'} (${compFail.status})`);

  const compSuccess = await testApi('PATCH', `/api/bookings/${bookingId}/status`, { status: 'completed', completionOtp: compOtp }, providerAToken);
  console.log(`Valid Comp OTP Accepted: ${compSuccess.status === 200 ? 'PASS' : 'FAIL'} (${compSuccess.status})`);

  const reviewSpoof = await testApi('POST', '/api/reviews', { bookingId, providerId: providerA_ProviderId, customerId: customerBId, rating: 5 }, customerAToken);
  console.log(`Review spoofing prevented: ${reviewSpoof.status === 201 && reviewSpoof.data.review.customerId === customerAId ? 'PASS' : 'FAIL'} (${reviewSpoof.status})`);

  const walletAsC = await testApi('GET', '/api/provider/wallet', null, customerAToken);
  console.log(`Customer cannot access Wallet: ${walletAsC.status === 403 ? 'PASS' : 'FAIL'} (${walletAsC.status})`);

  const withdraw = await testApi('POST', '/api/provider/wallet/withdraw', { amount: 10 }, providerAToken);
  console.log(`Provider Withdrawal Success: ${withdraw.status === 200 ? 'PASS' : 'FAIL'} (${withdraw.status})`);
  
  console.log('--- DONE ---');
}

runTests();
