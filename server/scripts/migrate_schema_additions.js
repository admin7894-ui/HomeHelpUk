require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');

async function runSchemaMigration() {
  console.log('=== PHASE 1: Running Database Schema Migration ===');
  try {
    // 1. Categories additions
    console.log('Adding columns to categories table...');
    await db.query(`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
    `);

    // 2. Services additions
    console.log('Adding columns to services table...');
    await db.query(`
      ALTER TABLE services ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE services ADD COLUMN IF NOT EXISTS scheduling_config JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_rules JSONB DEFAULT '{}'::jsonb;
    `);

    // 3. Platform settings table
    console.log('Creating platform_settings table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      INSERT INTO platform_settings (key, value, description)
      VALUES ('platform_commission_pct', '11', 'Platform trust fee / commission percentage applied to all bookings')
      ON CONFLICT (key) DO NOTHING;
    `);

    console.log('✅ PHASE 1 COMPLETE: All schema columns and platform_settings created successfully.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ PHASE 1 FAILED:', err);
    process.exit(1);
  }
}

runSchemaMigration();
