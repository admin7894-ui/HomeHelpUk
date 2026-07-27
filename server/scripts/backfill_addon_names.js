require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');

async function backfillAddonNames() {
  try {
    const srvs = await db.query('SELECT id, name, addons FROM services');
    let updated = 0;
    for (const s of srvs.rows) {
      const addons = s.addons || [];
      if (!Array.isArray(addons) || addons.length === 0) continue;
      let changed = false;
      const nextAddons = addons.map((a, idx) => {
        let name = a.name || a.label || a.title;
        if (!name) {
          if (a.serviceId) {
            const parts = a.serviceId.replace('service_', '').split('_');
            name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
          } else {
            name = `Add-on ${idx + 1}`;
          }
          changed = true;
        }
        return {
          id: a.id || `addon_${Date.now()}_${idx}`,
          name: name.trim(),
          price: Number(a.price) || 0,
          serviceId: a.serviceId || null,
          requiresSeparateProvider: a.requiresSeparateProvider || false
        };
      });

      if (changed) {
        await db.query('UPDATE services SET addons = $1 WHERE id = $2', [JSON.stringify(nextAddons), s.id]);
        updated++;
      }
    }
    console.log(`✅ Backfilled add-on names for ${updated} services.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  }
}

backfillAddonNames();
