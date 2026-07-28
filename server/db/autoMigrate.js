const db = require('./db');

async function runAutoMigrations() {
  console.log('[DB Auto-Migration] Starting production database schema check...');
  try {
    // 1. Ensure user_push_tokens table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_push_tokens (
        id VARCHAR(60) PRIMARY KEY,
        user_id VARCHAR(60) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        push_token VARCHAR(255) UNIQUE NOT NULL,
        platform VARCHAR(20) DEFAULT 'android',
        device_id VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON user_push_tokens(user_id, is_active);
    `);
    console.log('[DB Auto-Migration] ✅ user_push_tokens table verified.');

    // 2. Ensure categories.short_description column exists
    await db.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS short_description TEXT;
    `);
    console.log('[DB Auto-Migration] ✅ categories.short_description column verified.');

    // 3. Ensure services.short_description column exists
    await db.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS short_description TEXT;
    `);
    console.log('[DB Auto-Migration] ✅ services.short_description column verified.');

    console.log('[DB Auto-Migration] All database migrations completed successfully.');
  } catch (err) {
    console.error('[DB Auto-Migration Error]', err.message);
  }
}

module.exports = { runAutoMigrations };
