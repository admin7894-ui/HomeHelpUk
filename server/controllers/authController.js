const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateId, generateFakeToken } = require('../utils/helpers');

async function formatUserResponse(userRow) {
  // Fetch providerId if provider
  let providerId = userRow.provider_id || null;
  let onboardingComplete = Boolean(userRow.onboarding_complete);

  if (userRow.role === 'provider' && !providerId) {
    const provRes = await db.query('SELECT id FROM providers WHERE user_id = $1', [userRow.id]);
    if (provRes.rows.length > 0) {
      providerId = provRes.rows[0].id;
    }
  }

  // Fetch addresses
  const addrRes = await db.query('SELECT address_line FROM user_addresses WHERE user_id = $1', [userRow.id]);
  const addresses = addrRes.rows.map(r => r.address_line);

  // Fetch favourite provider ids
  const favRes = await db.query('SELECT provider_id FROM user_favourites WHERE user_id = $1', [userRow.id]);
  const favouriteProviderIds = favRes.rows.map(r => r.provider_id);

  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    phone: userRow.phone || '',
    role: userRow.role,
    avatar: userRow.avatar_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(userRow.email)}`,
    addresses,
    favouriteProviderIds,
    ...(providerId ? { providerId, onboardingComplete } : {})
  };
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const userRes = await db.query(
      `SELECT u.*, p.id as provider_id
       FROM users u
       LEFT JOIN providers p ON u.id = p.user_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [String(email).trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const userPayload = await formatUserResponse(user);
    const token = generateFakeToken(userPayload);

    res.json({ success: true, token, user: userPayload });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({ success: false, message: 'Login failed due to server error' });
  }
};

exports.register = async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'name, email, password, and role are required' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = generateId('user');
    const avatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(cleanEmail)}`;

    await client.query(
      `INSERT INTO users (id, name, email, password_hash, phone, role, avatar_url, onboarding_complete)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, name, cleanEmail, passwordHash, phone || '', role, avatar, false]
    );

    let providerId = null;
    if (role === 'provider') {
      providerId = generateId('prov');
      await client.query(
        `INSERT INTO providers (id, user_id, bio, postcode, service_radius_miles, rating, review_count, verified, completed_jobs)
         VALUES ($1, $2, '', '', 10, 5.0, 0, false, 0)`,
        [providerId, userId]
      );

      const walletId = generateId('wallet');
      await client.query(
        `INSERT INTO wallets (id, provider_id, balance, pending_payouts)
         VALUES ($1, $2, 0.00, 0.00)`,
        [walletId, providerId]
      );
    }

    await client.query('COMMIT');

    const userPayload = {
      id: userId,
      name,
      email: cleanEmail,
      phone: phone || '',
      role,
      avatar,
      addresses: [],
      favouriteProviderIds: [],
      ...(providerId ? { providerId, onboardingComplete: false } : {})
    };

    const token = generateFakeToken(userPayload);
    res.status(201).json({ success: true, token, user: userPayload });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Auth Register Error]', err);
    res.status(500).json({ success: false, message: 'Registration failed due to server error' });
  } finally {
    client.release();
  }
};

exports.me = async (req, res) => {
  try {
    const userRes = await db.query(
      `SELECT u.*, p.id as provider_id
       FROM users u
       LEFT JOIN providers p ON u.id = p.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userPayload = await formatUserResponse(userRes.rows[0]);
    res.json({ success: true, user: userPayload });
  } catch (err) {
    console.error('[Auth Me Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
};
