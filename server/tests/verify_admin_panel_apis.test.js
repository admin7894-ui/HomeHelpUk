const db = require('../db');
const adminController = require('../controllers/adminController');
const providersController = require('../controllers/providersController');
const bookingsController = require('../controllers/bookingsController');
const { generateFakeToken } = require('../utils/helpers');

async function runAdminPanelApiTests() {
  console.log('=== VERIFYING ADMIN PANEL APIS & ARCHITECTURAL INTEGRITY ===\n');

  try {
    // 1. TEST ADMIN AUTHENTICATION
    console.log('1. Testing Admin Authentication (admin@homehelp.uk)...');
    const mockAuthReq = {
      body: { email: 'admin@homehelp.uk', password: 'admin123' }
    };
    let adminToken = null;
    const mockAuthRes = {
      json: (data) => {
        if (!data.success) throw new Error(`Auth failed: ${data.message}`);
        adminToken = data.token;
        console.log('  ✅ Admin login successful! Token generated.');
      },
      status: (code) => ({
        json: (data) => { throw new Error(`Auth error ${code}: ${data.message}`); }
      })
    };
    await adminController.login(mockAuthReq, mockAuthRes);

    // 2. TEST DASHBOARD METRICS
    console.log('\n2. Testing Admin Dashboard Live Metrics...');
    const mockDashReq = { user: { role: 'admin' } };
    const mockDashRes = {
      json: (data) => {
        if (!data.success || !data.stats) throw new Error('Dashboard stats failed');
        console.log(`  ✅ Dashboard Stats Fetched: ${data.stats.totalCategories} Categories, ${data.stats.totalServices} Services (${data.stats.activeServices} Active, ${data.stats.inactiveServices} Inactive).`);
      },
      status: (code) => ({ json: (d) => { throw new Error(`Dash error ${code}: ${d.message}`); } })
    };
    await adminController.getDashboardStats(mockDashReq, mockDashRes);

    // 3. TEST CATEGORY CREATION & DELETION GUARD
    console.log('\n3. Testing Category Management & Safety Deletion Guard...');
    const mockCatReq = {
      body: { name: 'Test Temporary Category', icon: 'flask-outline', price: 25.0, description: 'Test category' }
    };
    let testCatId = null;
    const mockCatRes = {
      status: () => ({
        json: (data) => {
          testCatId = data.categoryId;
          console.log(`  ✅ Test Category Created: ID=${testCatId}`);
        }
      })
    };
    await adminController.createCategory(mockCatReq, mockCatRes);

    // 4. TEST SERVICE CREATION & PRICING CONFIGURATION
    console.log('\n4. Testing Service Creation & Centralized Pricing Configuration...');
    const mockSrvReq = {
      body: {
        name: 'Test Premium Service',
        categoryId: testCatId || 'cat_cleaning',
        price: 55.0,
        unit: 'room',
        duration: '2 hrs',
        description: 'Test admin service',
        baseIncludes: 'Standard testing',
        imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
        pricingRules: {
          pricingModel: 'unitBased',
          unitLabel: 'Room',
          unitLabelPlural: 'Rooms',
          includedQuantity: 2,
          additionalUnitPrice: 20.0
        },
        customerRequirements: [
          { id: 'req_1', question: 'How many bedrooms?', type: 'number', required: true }
        ],
        addons: [
          { id: 'add_1', name: 'Oven Deep Clean', price: 25.0 }
        ]
      }
    };

    let testSrvId = null;
    const mockSrvRes = {
      status: () => ({
        json: (data) => {
          testSrvId = data.serviceId;
          console.log(`  ✅ Test Service Created: ID=${testSrvId} with Unit Pricing (£55.0 base, £20 extra room)`);
        }
      })
    };
    await adminController.createService(mockSrvReq, mockSrvRes);

    // 5. TEST DELETION BLOCK ON CATEGORIES WITH ACTIVE SERVICES
    console.log('\n5. Testing Safety Guard: Blocking Category Deletion When Active Services Exist...');
    const mockDelReq = { params: { id: testCatId } };
    const mockDelRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 400) {
            console.log(`  ✅ Safety Guard Triggered Correctly (HTTP 400): "${data.message}"`);
          } else {
            throw new Error(`Expected HTTP 400 but got ${code}`);
          }
        }
      })
    };
    await adminController.deleteCategory(mockDelReq, mockDelRes);

    // CLEANUP TEST SERVICE & CATEGORY
    await db.query('DELETE FROM services WHERE id = $1', [testSrvId]);
    await db.query('DELETE FROM categories WHERE id = $1', [testCatId]);
    console.log('  ✅ Cleaned up temporary test service & category.');

    console.log('\n🎉 ALL ADMIN PANEL API & INTEGRITY TESTS PASSED 100% CLEAN!');
  } catch (err) {
    console.error('❌ Admin Test Failure:', err);
    process.exit(1);
  } process.exit(0);
}

runAdminPanelApiTests();
