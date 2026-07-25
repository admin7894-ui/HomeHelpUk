require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === 'production') {
  console.error('[PostgreSQL Error] CRITICAL: DATABASE_URL environment variable is missing in production!');
}

const pool = new Pool({
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/homehelpuk',
  ssl: (process.env.NODE_ENV === 'production' || (connectionString && connectionString.includes('render.com')))
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Sanitize any potential error output to never leak connection credentials
  const safeMessage = err.message ? err.message.replace(/postgres(ql)?:\/\/[^@]+@/g, 'postgres://****:****@') : 'Database pool error';
  console.error('[PostgreSQL Pool Error]', safeMessage);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
