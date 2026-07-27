require('dotenv').config();
const db = require('../db');

async function updateCatalogLaunch() {
  console.log('================================================================');
  console.log('   HomeHelpUK Initial Launch Category & Service Catalog Update  ');
  console.log('================================================================\n');

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Add order_index columns to categories and services if not present
    console.log('1. Ensuring order_index columns exist in categories and services...');
    await client.query(`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 99;
      ALTER TABLE services ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 99;
    `);

    // 2. Define Category Updates
    const categoriesToUpdate = [
      { id: 'cat_cooking', name: 'Private Chef', order_index: 1 },
      { id: 'cat_cleaning', name: 'Cleaning', order_index: 2 },
      { id: 'cat_laundry', name: 'Laundry & Ironing', order_index: 3 },
      { id: 'cat_gardening', name: 'Gardening', order_index: 4 },
      { id: 'cat_handyman', name: 'Furniture & Home Installation', order_index: 5 },
      { id: 'cat_moving', name: 'Moving & Packing', order_index: 6 },
      { id: 'cat_home_services', name: 'Home Organization', order_index: 7 },
      { id: 'cat_pet_care', name: 'Pet Care', order_index: 8 },
      { id: 'cat_vehicle_care', name: 'Car Care', order_index: 9 },
      { id: 'cat_beauty', name: 'Beauty & Personal Care', order_index: 10 },
    ];

    console.log('\n2. Updating Launch Categories (Cooking first, 1..10)...');
    for (const cat of categoriesToUpdate) {
      const res = await client.query(
        `UPDATE categories SET name = $1, order_index = $2 WHERE id = $3 RETURNING id, name`,
        [cat.name, cat.order_index, cat.id]
      );
      if (res.rows.length > 0) {
        console.log(`   [✓] Category #${cat.order_index}: '${res.rows[0].name}' (${res.rows[0].id})`);
      } else {
        console.log(`   [+] Creating Category #${cat.order_index}: '${cat.name}' (${cat.id})`);
        await client.query(
          `INSERT INTO categories (id, name, icon, price, unit, description, order_index)
           VALUES ($1, $2, 'construct', 20.00, 'hr', $2, $3)`,
          [cat.id, cat.name, cat.order_index]
        );
      }
    }

    // Set order_index = 99 for any other categories
    await client.query(
      `UPDATE categories SET order_index = 99 WHERE id NOT IN (${categoriesToUpdate.map((_, i) => `$${i + 1}`).join(', ')})`,
      categoriesToUpdate.map(c => c.id)
    );

    // 3. Define Service Updates
    const servicesToUpdate = [
      // 1. Private Chef
      { id: 'service_home_cook', catId: 'cat_cooking', name: "Private Chef (customer's kitchen)", order_index: 1 },
      { id: 'service_family_meal_prep', catId: 'cat_cooking', name: 'Breakfast, Lunch & Dinner Preparation', order_index: 2 },

      // 2. Cleaning
      { id: 'service_standard_cleaning', catId: 'cat_cleaning', name: 'House Cleaning', order_index: 1 },
      { id: 'service_deep_cleaning', catId: 'cat_cleaning', name: 'Deep Cleaning', order_index: 2 },
      { id: 'service_end_of_tenancy', catId: 'cat_cleaning', name: 'End of Tenancy Cleaning', order_index: 3 },

      // 3. Laundry & Ironing
      { id: 'service_ironing', catId: 'cat_laundry', name: 'Laundry & Ironing', order_index: 1 },

      // 4. Gardening
      { id: 'service_lawn_mowing', catId: 'cat_gardening', name: 'Lawn Mowing', order_index: 1 },
      { id: 'service_garden_maintenance', catId: 'cat_gardening', name: 'Garden Maintenance', order_index: 2 },

      // 5. Furniture & Home Installation
      { id: 'service_furniture_assembly', catId: 'cat_handyman', name: 'Furniture Assembly', order_index: 1 },
      { id: 'service_shelf_install', catId: 'cat_handyman', name: 'Shelf Installation', order_index: 2 },

      // 6. Moving & Packing
      { id: 'service_moving_help', catId: 'cat_moving', name: 'Moving Help', order_index: 1 },
      { id: 'service_packing_unpacking', catId: 'cat_moving', name: 'Packing & Unpacking', order_index: 2 },

      // 7. Home Organization
      { id: 'service_home_organization', catId: 'cat_home_services', name: 'Home Organization', order_index: 1 },

      // 8. Pet Care
      { id: 'service_dog_walking', catId: 'cat_pet_care', name: 'Dog Walking', order_index: 1 },
      { id: 'service_pet_sitting', catId: 'cat_pet_care', name: 'Pet Sitting', order_index: 2 },

      // 9. Car Care
      { id: 'service_mobile_car_wash', catId: 'cat_vehicle_care', name: 'Mobile Car Wash', order_index: 1 },

      // 10. Beauty & Personal Care
      { id: 'service_haircut_styling', catId: 'cat_beauty', name: 'Haircut & Hair Styling', order_index: 1 },
      { id: 'service_facial', catId: 'cat_beauty', name: 'Facial', order_index: 2 },
      { id: 'service_threading', catId: 'cat_beauty', name: 'Threading', order_index: 3 },
      { id: 'service_manicure', catId: 'cat_beauty', name: 'Manicure & Pedicure', order_index: 4 },
      { id: 'service_makeup_party', catId: 'cat_beauty', name: 'Party Makeup', order_index: 5 },
    ];

    console.log('\n3. Updating Launch Services and Order Indexes...');
    for (const srv of servicesToUpdate) {
      const res = await client.query(
        `UPDATE services SET name = $1, order_index = $2, category_id = $3 WHERE id = $4 RETURNING id, name`,
        [srv.name, srv.order_index, srv.catId, srv.id]
      );
      if (res.rows.length > 0) {
        console.log(`   [✓] Service '${res.rows[0].name}' (${res.rows[0].id}) -> Cat: ${srv.catId}, Order: ${srv.order_index}`);
      } else {
        console.log(`   [+] Inserting Service '${srv.name}' (${srv.id})...`);
        await client.query(
          `INSERT INTO services (id, category_id, name, price, unit, duration, description, order_index)
           VALUES ($1, $2, $3, 30.00, 'hr', '1-2 hrs', $4, $5)`,
          [srv.id, srv.catId, srv.name, srv.name, srv.order_index]
        );
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Catalog update transaction committed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ FAIL: Catalog update transaction failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

updateCatalogLaunch();
