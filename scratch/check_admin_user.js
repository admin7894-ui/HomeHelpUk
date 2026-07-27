const db = require('../server/db');
const bcrypt = require('bcryptjs');

async function checkAndSeedAdmin() {
  try {
    const res = await db.query("SELECT * FROM users WHERE role = 'admin' OR LOWER(email) = 'admin@homehelp.uk'");
    if (res.rows.length > 0) {
      console.log('Admin user found:', res.rows[0].email, 'role:', res.rows[0].role);
    } else {
      console.log('No admin user found. Creating admin user...');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, phone, role, onboarding_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['user_admin_001', 'Platform Administrator', 'admin@homehelp.uk', hash, '+442079460000', 'admin', true]
      );
      console.log('Successfully created admin user: admin@homehelp.uk / admin123');
    }
  } catch (err) {
    console.error('Error checking admin user:', err);
  } finally {
    process.exit(0);
  }
}

checkAndSeedAdmin();
