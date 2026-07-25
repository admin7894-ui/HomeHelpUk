const db = require('../db');

async function formatUserProfile(userId) {
  const uRes = await db.query(
    `SELECT u.*, p.id as provider_id
     FROM users u
     LEFT JOIN providers p ON u.id = p.user_id
     WHERE u.id = $1`,
    [userId]
  );
  if (uRes.rows.length === 0) return null;
  const userRow = uRes.rows[0];

  const addrRes = await db.query('SELECT address_line FROM user_addresses WHERE user_id = $1', [userId]);
  const addresses = addrRes.rows.map(r => r.address_line);

  const favRes = await db.query('SELECT provider_id FROM user_favourites WHERE user_id = $1', [userId]);
  const favouriteProviderIds = favRes.rows.map(r => r.provider_id);

  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    phone: userRow.phone || '',
    role: userRow.role,
    avatar: userRow.avatar_url || '',
    addresses,
    favouriteProviderIds,
    ...(userRow.provider_id ? { providerId: userRow.provider_id, onboardingComplete: Boolean(userRow.onboarding_complete) } : {})
  };
}

exports.update = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied: not your profile' });
    }

    const { name, phone, avatar, addresses, onboardingComplete, verifiedPhone } = req.body;

    const uRes = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (uRes.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const u = uRes.rows[0];

    const newName = name !== undefined ? name : u.name;
    const newPhone = phone !== undefined ? phone : u.phone;
    const newAvatar = avatar !== undefined ? avatar : u.avatar_url;
    const newOnboarding = onboardingComplete !== undefined ? Boolean(onboardingComplete) : Boolean(u.onboarding_complete);
    const newVerifiedPhone = verifiedPhone !== undefined ? Boolean(verifiedPhone) : Boolean(u.verified_phone);

    await db.query(
      `UPDATE users
       SET name = $1, phone = $2, avatar_url = $3, onboarding_complete = $4, verified_phone = $5, updated_at = NOW()
       WHERE id = $6`,
      [newName, newPhone, newAvatar, newOnboarding, newVerifiedPhone, req.params.id]
    );

    if (Array.isArray(addresses)) {
      await db.query('DELETE FROM user_addresses WHERE user_id = $1', [req.params.id]);
      for (let i = 0; i < addresses.length; i++) {
        const addrLine = typeof addresses[i] === 'string' ? addresses[i] : JSON.stringify(addresses[i]);
        const addrId = `addr_${req.params.id}_${i}_${Date.now()}`;
        await db.query(
          `INSERT INTO user_addresses (id, user_id, address_line, is_default) VALUES ($1, $2, $3, $4)`,
          [addrId, req.params.id, addrLine, i === 0]
        );
      }
    }

    const userPayload = await formatUserProfile(req.params.id);
    res.json({ success: true, user: userPayload });
  } catch (err) {
    console.error('[Profile update Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.toggleFavourite = async (req, res) => {
  try {
    const { providerId } = req.body;

    if (req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied: not your profile' });
    }

    const favRes = await db.query(
      'SELECT 1 FROM user_favourites WHERE user_id = $1 AND provider_id = $2',
      [req.params.id, providerId]
    );

    if (favRes.rows.length > 0) {
      await db.query('DELETE FROM user_favourites WHERE user_id = $1 AND provider_id = $2', [req.params.id, providerId]);
    } else {
      await db.query('INSERT INTO user_favourites (user_id, provider_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, providerId]);
    }

    const updatedFavs = await db.query('SELECT provider_id FROM user_favourites WHERE user_id = $1', [req.params.id]);
    res.json({ success: true, favouriteProviderIds: updatedFavs.rows.map(r => r.provider_id) });
  } catch (err) {
    console.error('[Profile toggleFavourite Error]', err);
    res.status(500).json({ success: false, message: 'Failed to toggle favourite provider' });
  }
};
