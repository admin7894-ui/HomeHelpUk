require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');

async function validateMigrationGate() {
  console.log('=== MIGRATION GATE VALIDATION ===');
  let failures = [];

  try {
    // 1. Check Platform Settings
    const psRes = await db.query("SELECT value FROM platform_settings WHERE key = 'platform_commission_pct'");
    if (psRes.rows.length === 0 || !psRes.rows[0].value) {
      failures.push("platform_settings: 'platform_commission_pct' missing or empty");
    }

    // 2. Check 9 Deactivated Services
    const removedIds = [
      'service_boiler_gas_repairs', 'service_electrical_repairs', 'service_babysitting',
      'service_elderly_companion_visits', 'service_garden_waste_removal', 'service_event_catering',
      'service_moving_help', 'service_massage_wellness', 'service_pet_sitting'
    ];
    const srvDeactiveCheck = await db.query(`
      SELECT id, is_active, is_archived FROM services WHERE id = ANY($1)
    `, [removedIds]);

    srvDeactiveCheck.rows.forEach(srv => {
      if (srv.is_active !== false || srv.is_archived !== true) {
        failures.push(`Deactivated service '${srv.id}' is active or not archived in DB! (is_active=${srv.is_active}, is_archived=${srv.is_archived})`);
      }
    });

    // 3. Check All Categories have image_url
    const catCheck = await db.query('SELECT id, name, image_url FROM categories');
    catCheck.rows.forEach(cat => {
      if (!cat.image_url) {
        failures.push(`Category '${cat.id}' (${cat.name}) is missing image_url`);
      }
    });

    // 4. Check All Active Services Have Unit Config, Media, Scheduling, Eligibility
    const srvCheck = await db.query('SELECT * FROM services WHERE is_active = true AND is_archived = false');
    console.log(`Checking ${srvCheck.rows.length} active services for mandatory configuration...`);

    srvCheck.rows.forEach(srv => {
      const pRules = srv.pricing_rules || {};
      const sConf = srv.scheduling_config || {};
      const pElig = srv.provider_eligibility || {};

      if (!srv.image_url) {
        failures.push(`Service '${srv.id}' missing image_url`);
      }
      if (!pRules.unitLabel) {
        failures.push(`Service '${srv.id}' missing pricing_rules.unitLabel`);
      }
      if (pRules.includedQuantity === undefined) {
        failures.push(`Service '${srv.id}' missing pricing_rules.includedQuantity`);
      }
      if (!sConf.defaultDurationHours) {
        failures.push(`Service '${srv.id}' missing scheduling_config.defaultDurationHours`);
      }
      if (!pElig.requiresInsurance && pElig.requiresInsurance !== false) {
        failures.push(`Service '${srv.id}' missing provider_eligibility configuration`);
      }
    });

    if (failures.length > 0) {
      console.error('\n❌ MIGRATION GATE FAILED! The following validation checks failed:');
      failures.forEach(f => console.error(`  - ${f}`));
      console.error('\n[GATE ACTION] Mobile app refactor cannot proceed until migration issues are resolved.');
      process.exit(1);
    }

    console.log(`✅ MIGRATION GATE PASSED 100%! All ${srvCheck.rows.length} active services & ${catCheck.rows.length} categories are fully configured in PostgreSQL.\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ MIGRATION GATE ERROR:', err);
    process.exit(1);
  }
}

validateMigrationGate();
