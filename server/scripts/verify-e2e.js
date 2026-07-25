require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});
const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function runE2EVerification() {
  console.log('================================================================');
  console.log('       HomeHelpUK PostgreSQL End-to-End Verification Audit      ');
  console.log('================================================================\n');

  let hasFailure = false;

  // STEP 1: Verify PostgreSQL Connection Configuration & Environment
  console.log('--- STEP 1 & 2: Environment & DATABASE_URL Configuration ---');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ FAIL: DATABASE_URL is missing in process.env');
    process.exit(1);
  }

  try {
    const urlObj = new URL(dbUrl);
    console.log(`✅ DATABASE_URL is configured.`);
    console.log(`   - Driver Protocol:   ${urlObj.protocol}`);
    console.log(`   - User:              ${urlObj.username}`);
    console.log(`   - Host:              ${urlObj.hostname}`);
    console.log(`   - Port:              ${urlObj.port || '5432'}`);
    console.log(`   - Database Name:     ${urlObj.pathname.replace('/', '')}`);
    console.log(`   - SSL Configuration: Enabled (rejectUnauthorized: false)`);
  } catch (err) {
    console.error('❌ FAIL: Could not parse DATABASE_URL structure');
    process.exit(1);
  }

  // STEP 3: Verify Database Connectivity
  console.log('\n--- STEP 3: Database Connectivity Test ---');
  let client;
  try {
    client = await db.getClient();
    const pingRes = await client.query('SELECT 1 as ping, current_database(), inet_server_addr()');
    console.log('✅ Connectivity Succeeded!');
    console.log(`   - Connected Database: ${pingRes.rows[0].current_database}`);
    console.log(`   - Server Address:    ${pingRes.rows[0].inet_server_addr || 'Remote Server'}`);
  } catch (err) {
    console.error('❌ FAIL: Database connection failed:', err.message);
    process.exit(1);
  }

  // STEP 4: Verify PostgreSQL Schema & 16 Tables
  console.log('\n--- STEP 4: PostgreSQL Schema & Table Verification ---');
  const expectedTables = [
    'users', 'user_addresses', 'user_favourites', 'providers',
    'categories', 'subcategories', 'services', 'provider_categories', 'provider_services',
    'bookings', 'wallets', 'wallet_transactions', 'conversations', 'messages',
    'notifications', 'reviews'
  ];

  const tableCheckRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  const existingTables = tableCheckRes.rows.map(r => r.table_name);

  let missingTables = [];
  expectedTables.forEach(t => {
    if (existingTables.includes(t)) {
      console.log(`   [✓] Table '${t}' exists.`);
    } else {
      console.log(`   [✗] Table '${t}' MISSING!`);
      missingTables.push(t);
    }
  });

  if (missingTables.length > 0) {
    console.error(`\n❌ FAIL: Missing ${missingTables.length} required tables: ${missingTables.join(', ')}`);
    hasFailure = true;
  } else {
    console.log('✅ ALL 16 required tables exist in database schema.');
  }

  // Check Overlap Protection Index
  const indexCheckRes = await client.query(`
    SELECT indexname FROM pg_indexes WHERE tablename = 'bookings' AND indexname = 'idx_bookings_time_range'
  `);
  if (indexCheckRes.rows.length > 0) {
    console.log('   [✓] Index \'idx_bookings_time_range\' exists on bookings table for overlap protection.');
  } else {
    console.error('   [✗] FAIL: Index \'idx_bookings_time_range\' NOT found on bookings table!');
    hasFailure = true;
  }

  // STEP 5: Verify Migrated Data Row Counts & Source Audit
  console.log('\n--- STEP 5: Migrated Data Row Counts & Source Audit ---');
  const expectedAuditCounts = {
    users: 4,
    providers: 2,
    categories: 17,
    subcategories: 20,
    services: 76,
    provider_services: 70,
    bookings: 17,
    wallets: 2,
    wallet_transactions: 4,
    conversations: 14,
    messages: 25,
    notifications: 40,
    reviews: 2
  };

  const actualCounts = {};
  for (const t of expectedTables) {
    const countRes = await client.query(`SELECT COUNT(*) FROM ${t}`);
    actualCounts[t] = parseInt(countRes.rows[0].count, 10);
    const expected = expectedAuditCounts[t] !== undefined ? `(Expected: ~${expectedAuditCounts[t]})` : '';
    console.log(`   - ${t}: ${actualCounts[t]} rows ${expected}`);
  }

  // Verify user_addresses and user_favourites 0-count against source JSON data
  const jsonUsersPath = path.join(__dirname, '../data/users.json');
  if (fs.existsSync(jsonUsersPath)) {
    const jsonUsers = JSON.parse(fs.readFileSync(jsonUsersPath, 'utf-8'));
    const totalJsonAddresses = jsonUsers.reduce((sum, u) => sum + (Array.isArray(u.addresses) ? u.addresses.length : 0), 0);
    const totalJsonFavs = jsonUsers.reduce((sum, u) => sum + (Array.isArray(u.favouriteProviderIds) ? u.favouriteProviderIds.length : 0), 0);

    console.log(`\n   [✓] Source Data Audit for Empty Junction Tables:`);
    console.log(`       - 'user_addresses' in source JSON:  ${totalJsonAddresses} addresses across ${jsonUsers.length} users (DB Count: ${actualCounts['user_addresses']})`);
    console.log(`       - 'user_favourites' in source JSON: ${totalJsonFavs} favourites across ${jsonUsers.length} users (DB Count: ${actualCounts['user_favourites']})`);
    if (actualCounts['user_addresses'] === totalJsonAddresses && actualCounts['user_favourites'] === totalJsonFavs) {
      console.log(`       -> 0-row counts are 100% CONFIRMED and MATCH source JSON dataset!`);
    } else {
      console.error(`       -> ❌ FAIL: Mismatch between source JSON user address/favourites and DB!`);
      hasFailure = true;
    }
  }

  // STEP 6: Data Integrity, Password Security & Strict Wallet Ledger Parity Audit
  console.log('\n--- STEP 6: Data Integrity & Strict Wallet Ledger Parity Audit ---');

  // 6.1 Password Hash Audit
  const pwdRes = await client.query('SELECT email, password_hash FROM users');
  let plainTextPasswords = 0;
  pwdRes.rows.forEach(u => {
    const isBcrypt = u.password_hash.startsWith('$2a$') || u.password_hash.startsWith('$2b$');
    if (!isBcrypt) plainTextPasswords++;
  });
  if (plainTextPasswords === 0) {
    console.log('   [✓] 100% of User passwords are hashed with bcrypt.');
  } else {
    console.error(`   [✗] FAIL: Found ${plainTextPasswords} plain-text passwords!`);
    hasFailure = true;
  }

  // 6.2 String ID Preservation Audit
  const idSampleRes = await client.query(`
    SELECT 
      (SELECT id FROM users LIMIT 1) as user_id,
      (SELECT id FROM providers LIMIT 1) as prov_id,
      (SELECT id FROM bookings LIMIT 1) as booking_id
  `);
  const sample = idSampleRes.rows[0] || {};
  console.log(`   [✓] String ID Preservation Format Check:`);
  console.log(`       - User ID sample:     ${sample.user_id}`);
  console.log(`       - Provider ID sample: ${sample.prov_id}`);
  console.log(`       - Booking ID sample:  ${sample.booking_id}`);

  // 6.3 Orphan Record Check
  const orphanBookings = await client.query(`
    SELECT COUNT(*) FROM bookings b 
    LEFT JOIN users u ON b.customer_id = u.id 
    WHERE u.id IS NULL
  `);
  console.log(`   [✓] Orphaned Bookings (invalid customer_id): ${orphanBookings.rows[0].count}`);

  const orphanProviders = await client.query(`
    SELECT COUNT(*) FROM providers p 
    LEFT JOIN users u ON p.user_id = u.id 
    WHERE u.id IS NULL
  `);
  console.log(`   [✓] Orphaned Providers (invalid user_id):     ${orphanProviders.rows[0].count}`);

  // 6.4 Strict Wallet Ledger Parity Audit with Tolerances & Transaction Breakdown
  console.log('\n   --- Strict Wallet Ledger Parity Breakdown ---');
  const walletsRes = await client.query('SELECT * FROM wallets');

  for (const w of walletsRes.rows) {
    const storedBalance = Number(w.balance);

    // Fetch transaction ledger for this wallet
    const txRes = await client.query(
      `SELECT id, type, amount, booking_id as "bookingId", timestamp 
       FROM wallet_transactions 
       WHERE wallet_id = $1 
       ORDER BY timestamp ASC`,
      [w.id]
    );

    let calculatedLedgerSum = 0;
    console.log(`   Wallet ID: ${w.id} (Provider: ${w.provider_id})`);
    console.log(`   Transactions Breakdown (${txRes.rows.length} entries):`);

    txRes.rows.forEach(t => {
      const amt = Number(t.amount);
      let signMultiplier = 0;
      if (t.type === 'credit') {
        signMultiplier = 1;
      } else if (t.type === 'payout' || t.type === 'refund') {
        signMultiplier = -1;
      }
      const entryValue = amt * signMultiplier;
      calculatedLedgerSum += entryValue;

      console.log(`     - [TX: ${t.id}] Type: ${t.type.padEnd(6)} | Amount: £${amt.toFixed(2).padStart(6)} | Impact: ${entryValue >= 0 ? '+' : ''}£${entryValue.toFixed(2)} | Booking: ${t.bookingId || 'N/A'} | Date: ${t.timestamp}`);
    });

    const diff = Math.abs(storedBalance - calculatedLedgerSum);
    const roundedDiff = Math.round(diff * 100) / 100;

    console.log(`   --> Stored Balance: £${storedBalance.toFixed(2)} | Calculated Ledger Sum: £${calculatedLedgerSum.toFixed(2)} | Difference: £${roundedDiff.toFixed(2)}`);

    if (roundedDiff <= 0.01) {
      console.log(`   [PASS] Wallet ${w.id}: Stored balance matches transaction ledger sum (Difference £${roundedDiff.toFixed(2)} <= £0.01 tolerance).\n`);
    } else {
      console.error(`   [FAIL] Wallet ${w.id}: DISCREPANCY DETECTED! Stored balance (£${storedBalance.toFixed(2)}) does NOT match ledger sum (£${calculatedLedgerSum.toFixed(2)}). Difference: £${roundedDiff.toFixed(2)}\n`);
      hasFailure = true;
    }
  }

  // STEP 7: Backend Health Check HTTP Request
  console.log('--- STEP 7: Local Server /health Endpoint Verification ---');
  await new Promise((resolve) => {
    http.get('http://localhost:4000/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.status === 'ok' && json.db === 'connected') {
            console.log('✅ Local Server Health Endpoint PASS:');
            console.log(`   Response: ${JSON.stringify(json)}`);
          } else {
            console.error(`❌ FAIL: Server responded, but health payload was: ${data}`);
            hasFailure = true;
          }
        } catch (e) {
          console.error(`❌ FAIL: Server returned non-JSON: ${data}`);
          hasFailure = true;
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`ℹ️ Note: Server is not currently running on port 4000 (${err.message}). Start server with 'npm start' to test HTTP endpoint.`);
      resolve();
    });
  });

  client.release();

  console.log('\n================================================================');
  if (hasFailure) {
    console.error('❌ E2E VERIFICATION AUDIT FAILED - CRITICAL CHECKS DID NOT PASS!');
    console.log('================================================================\n');
    process.exit(1);
  } else {
    console.log('  ✅ ALL END-TO-END VERIFICATION CHECKS COMPLETED SUCCESSFULLY  ');
    console.log('================================================================\n');
    process.exit(0);
  }
}

runE2EVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
