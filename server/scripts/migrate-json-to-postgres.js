require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { parseTime } = require('../utils/helpers');

const dataDir = path.join(__dirname, '../data');

function readJson(filename) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return [];
  }
}

async function runMigration() {
  console.log('--- Starting HomeHelpUK JSON to PostgreSQL Migration ---');

  const schemaSql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
  
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    await client.query('DROP INDEX IF EXISTS idx_wallet_credit_idempotency;');
    console.log('1. Executing Schema DDL SQL...');
    await client.query(schemaSql);
    console.log('   Schema initialized successfully.');

    // 1. Users
    const users = readJson('users.json');
    console.log(`2. Migrating ${users.length} Users...`);
    for (const u of users) {
      // Hash plaintext password using bcrypt (salt rounds = 10)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = u.password ? await bcrypt.hash(u.password, salt) : await bcrypt.hash('password123', salt);
      // Sanitize email if invalid
      let email = (u.email || '').toLowerCase().trim();
      if (!email.includes('@')) {
        email = `${email}@homehelpuk.co.uk`;
      }

      await client.query(
        `INSERT INTO users (id, name, email, password_hash, phone, role, avatar_url, onboarding_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           phone = EXCLUDED.phone,
           role = EXCLUDED.role,
           avatar_url = EXCLUDED.avatar_url,
           onboarding_complete = EXCLUDED.onboarding_complete;`,
        [u.id, u.name, email, passwordHash, u.phone || '', u.role || 'customer', u.avatar || '', Boolean(u.onboardingComplete)]
      );

      // User addresses
      if (Array.isArray(u.addresses)) {
        for (let i = 0; i < u.addresses.length; i++) {
          const addr = u.addresses[i];
          const addrId = addr.id || `addr_${u.id}_${i}`;
          const addrLine = typeof addr === 'string' ? addr : (addr.addressLine || JSON.stringify(addr));
          await client.query(
            `INSERT INTO user_addresses (id, user_id, address_line, is_default)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING;`,
            [addrId, u.id, addrLine, i === 0]
          );
        }
      }
    }

    // 2. Providers
    const providers = readJson('providers.json');
    console.log(`3. Migrating ${providers.length} Providers...`);
    for (const p of providers) {
      await client.query(
        `INSERT INTO providers (id, user_id, bio, postcode, service_radius_miles, rating, review_count, verified, completed_jobs, vacation_mode, emergency_unavailable, weekly_availability, holidays, documents, bank_details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           bio = EXCLUDED.bio,
           postcode = EXCLUDED.postcode,
           service_radius_miles = EXCLUDED.service_radius_miles,
           rating = EXCLUDED.rating,
           review_count = EXCLUDED.review_count,
           verified = EXCLUDED.verified,
           completed_jobs = EXCLUDED.completed_jobs,
           weekly_availability = EXCLUDED.weekly_availability,
           holidays = EXCLUDED.holidays,
           documents = EXCLUDED.documents,
           bank_details = EXCLUDED.bank_details;`,
        [
          p.id,
          p.userId,
          p.bio || '',
          p.postcode || '',
          Number(p.serviceRadiusMiles) || 10.0,
          Number(p.rating) || 5.0,
          Number(p.reviewCount) || 0,
          Boolean(p.verified),
          Number(p.completedJobs) || 0,
          Boolean(p.availability?.vacationMode),
          Boolean(p.availability?.emergencyUnavailable),
          JSON.stringify(p.availability?.weekly || {}),
          JSON.stringify(p.availability?.holidays || []),
          JSON.stringify(p.documents || {}),
          JSON.stringify(p.bankDetails || {})
        ]
      );

      // User Favourites (from users.json)
      for (const u of users) {
        if (Array.isArray(u.favouriteProviderIds) && u.favouriteProviderIds.includes(p.id)) {
          await client.query(
            `INSERT INTO user_favourites (user_id, provider_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, provider_id) DO NOTHING;`,
            [u.id, p.id]
          );
        }
      }
    }

    // 3. Categories, Subcategories, Services
    const categories = readJson('categories.json');
    console.log(`4. Migrating Categories & Canonical Services Catalog...`);
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (id, name, icon, price, unit, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           icon = EXCLUDED.icon,
           price = EXCLUDED.price,
           unit = EXCLUDED.unit,
           description = EXCLUDED.description;`,
        [cat.id, cat.name, cat.icon || '', Number(cat.price) || 0, cat.unit || '', cat.description || '']
      );

      if (Array.isArray(cat.subcategories)) {
        for (const sub of cat.subcategories) {
          await client.query(
            `INSERT INTO subcategories (id, category_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`,
            [sub.id, cat.id, sub.name]
          );

          if (Array.isArray(sub.services)) {
            for (const srv of sub.services) {
              await client.query(
                `INSERT INTO services (
                   id, subcategory_id, category_id, name, price, unit, duration, description,
                   base_includes, additional_charge, max_quantity, whats_included, whats_not_included,
                   addons, faqs, pricing_rules, dynamic_pricing
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                 ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name,
                   price = EXCLUDED.price,
                   unit = EXCLUDED.unit,
                   description = EXCLUDED.description,
                   whats_included = EXCLUDED.whats_included,
                   whats_not_included = EXCLUDED.whats_not_included,
                   addons = EXCLUDED.addons,
                   faqs = EXCLUDED.faqs,
                   pricing_rules = EXCLUDED.pricing_rules,
                   dynamic_pricing = EXCLUDED.dynamic_pricing;`,
                [
                  srv.id,
                  sub.id,
                  cat.id,
                  srv.name,
                  Number(srv.price) || 0,
                  srv.unit || 'visit',
                  srv.duration || '',
                  srv.description || '',
                  srv.baseIncludes || '',
                  Number(srv.additionalCharge) || 0,
                  Number(srv.maxQuantity) || 1,
                  JSON.stringify(srv.whatsIncluded || []),
                  JSON.stringify(srv.whatsNotIncluded || []),
                  JSON.stringify(srv.addons || srv.customAddOns || []),
                  JSON.stringify(srv.faqs || []),
                  JSON.stringify(srv.pricingRules || {}),
                  JSON.stringify(srv.dynamicPricing || {})
                ]
              );
            }
          }
        }
      }
    }

    // 4. Provider Categories & Provider Services
    console.log(`5. Migrating Provider Service Customizations...`);
    for (const p of providers) {
      if (Array.isArray(p.categories)) {
        for (const catId of p.categories) {
          // Check if category exists
          const catCheck = await client.query(`SELECT id FROM categories WHERE id = $1`, [catId]);
          if (catCheck.rows.length > 0) {
            await client.query(
              `INSERT INTO provider_categories (provider_id, category_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING;`,
              [p.id, catId]
            );
          }
        }
      }

      if (Array.isArray(p.services)) {
        for (const ps of p.services) {
          const serviceId = typeof ps === 'string' ? ps : ps.serviceId;
          const srvCheck = await client.query(`SELECT id FROM services WHERE id = $1`, [serviceId]);
          if (srvCheck.rows.length > 0) {
            const psId = `ps_${p.id}_${serviceId}`;
            const customPrice = typeof ps === 'object' ? Number(ps.customPrice) : null;
            const enabled = typeof ps === 'object' ? Boolean(ps.enabled !== false) : true;
            const customDesc = typeof ps === 'object' ? ps.customDescription || null : null;
            const customInc = typeof ps === 'object' ? JSON.stringify(ps.customWhatsIncluded || null) : null;
            const customExc = typeof ps === 'object' ? JSON.stringify(ps.customWhatsNotIncluded || null) : null;
            const customAdd = typeof ps === 'object' ? JSON.stringify(ps.customAddOns || null) : null;
            const customFaq = typeof ps === 'object' ? JSON.stringify(ps.customFaqs || null) : null;
            const prRules = typeof ps === 'object' ? JSON.stringify(ps.pricingRules || null) : null;

            await client.query(
              `INSERT INTO provider_services (
                 id, provider_id, service_id, custom_price, enabled, custom_description,
                 custom_whats_included, custom_whats_not_included, custom_addons, custom_faqs, pricing_rules
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (provider_id, service_id) DO UPDATE SET
                 custom_price = EXCLUDED.custom_price,
                 enabled = EXCLUDED.enabled,
                 custom_description = EXCLUDED.custom_description,
                 custom_whats_included = EXCLUDED.custom_whats_included,
                 custom_whats_not_included = EXCLUDED.custom_whats_not_included,
                 custom_addons = EXCLUDED.custom_addons,
                 custom_faqs = EXCLUDED.custom_faqs,
                 pricing_rules = EXCLUDED.pricing_rules;`,
              [psId, p.id, serviceId, customPrice, enabled, customDesc, customInc, customExc, customAdd, customFaq, prRules]
            );
          }
        }
      }
    }

    // 5. Bookings
    const bookings = readJson('bookings.json');
    console.log(`6. Migrating ${bookings.length} Bookings...`);
    for (const b of bookings) {
      const startTimeMs = parseTime(b.date, b.time) || new Date(b.date || Date.now()).getTime();
      const startTimestamp = new Date(startTimeMs).toISOString();
      const durationHours = Number(b.durationHours) || 1.0;
      const endTimestamp = new Date(startTimeMs + (durationHours * 60 * 60 * 1000)).toISOString();
      const providerId = (b.providerId && b.providerId !== 'open') ? b.providerId : null;

      await client.query(
        `INSERT INTO bookings (
           id, customer_id, provider_id, category_id, status, date, time,
           start_timestamp, end_timestamp, address, notes, duration_hours, service_quantity,
           hourly_rate, subtotal, service_fee, total, provider_payout, platform_commission_pct,
           start_otp, completion_otp, photos, pricing_breakdown, pricing_snapshot, decline_records, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           provider_id = EXCLUDED.provider_id,
           photos = EXCLUDED.photos,
           decline_records = EXCLUDED.decline_records;`,
        [
          b.id,
          b.customerId,
          providerId,
          b.categoryId,
          b.status || 'pending',
          b.date,
          b.time,
          startTimestamp,
          endTimestamp,
          b.address || '',
          b.notes || '',
          durationHours,
          Number(b.serviceQuantity) || 1,
          Number(b.hourlyRate) || 20,
          Number(b.subtotal) || Number(b.total) || 20,
          Number(b.serviceFee) || 0,
          Number(b.total) || 20,
          Number(b.providerPayout) || Number(b.subtotal) || 20,
          Number(b.platformCommissionPct) || 11.0,
          b.startOtp || null,
          b.completionOtp || null,
          JSON.stringify(b.photos || {}),
          JSON.stringify(b.pricingBreakdown || null),
          JSON.stringify(b.pricingSnapshot || null),
          JSON.stringify(b.declineRecords || []),
          b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString()
        ]
      );
    }

    // 6. Wallets & Transactions
    const wallets = readJson('wallets.json');
    console.log(`7. Migrating ${wallets.length} Wallets & Transactions...`);
    for (const w of wallets) {
      await client.query(
        `INSERT INTO wallets (id, provider_id, balance, pending_payouts)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           balance = EXCLUDED.balance,
           pending_payouts = EXCLUDED.pending_payouts;`,
        [w.id, w.providerId, Number(w.balance) || 0, Number(w.pendingPayouts) || 0]
      );

      if (Array.isArray(w.transactions)) {
        for (const tx of w.transactions) {
          const bookingId = tx.bookingId || null;
          await client.query(
            `INSERT INTO wallet_transactions (id, wallet_id, booking_id, type, amount, status, description, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT DO NOTHING;`,
            [
              tx.id,
              w.id,
              bookingId,
              tx.type || 'credit',
              Number(tx.amount) || 0,
              tx.status || 'completed',
              tx.description || '',
              tx.timestamp ? new Date(tx.timestamp).toISOString() : new Date().toISOString()
            ]
          );
        }
      }
    }

    // 7. Chats & Messages
    const chats = readJson('chats.json');
    console.log(`8. Migrating ${chats.length} Chat Conversations & Messages...`);
    for (const c of chats) {
      // Check if booking exists
      const bookingCheck = await client.query(`SELECT id FROM bookings WHERE id = $1`, [c.bookingId]);
      if (bookingCheck.rows.length > 0) {
        await client.query(
          `INSERT INTO conversations (id, booking_id, customer_id, provider_id, category_id, service_name, booking_date, booking_time, hidden_for)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET hidden_for = EXCLUDED.hidden_for;`,
          [
            c.id,
            c.bookingId,
            c.customerId,
            c.providerId,
            c.categoryId,
            c.serviceName || '',
            c.bookingDate || null,
            c.bookingTime || '',
            JSON.stringify(c.hiddenFor || [])
          ]
        );

        if (Array.isArray(c.messages)) {
          for (const m of c.messages) {
            await client.query(
              `INSERT INTO messages (id, conversation_id, sender_id, text, image_url, read, timestamp)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO NOTHING;`,
              [
                m.id,
                c.id,
                m.senderId,
                m.text || '',
                m.image || null,
                Boolean(m.read),
                m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString()
              ]
            );
          }
        }
      }
    }

    // 8. Notifications
    const notifications = readJson('notifications.json');
    console.log(`9. Migrating ${notifications.length} Notifications...`);
    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (id, user_id, title, message, read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING;`,
        [
          n.id,
          n.userId,
          n.title || '',
          n.message || '',
          Boolean(n.read),
          n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString()
        ]
      );
    }

    // 9. Reviews
    const reviews = readJson('reviews.json');
    console.log(`10. Migrating ${reviews.length} Reviews...`);
    for (const r of reviews) {
      await client.query(
        `INSERT INTO reviews (id, booking_id, provider_id, customer_id, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           rating = EXCLUDED.rating,
           comment = EXCLUDED.comment;`,
        [
          r.id,
          r.bookingId,
          r.providerId,
          r.customerId,
          Number(r.rating) || 5,
          r.comment || '',
          r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
        ]
      );
    }

    await client.query('COMMIT');
    console.log('--- Migration Transaction Committed Successfully! ---');

    // Audit verification
    console.log('\n--- Migration Audit Record Counts ---');
    const tables = ['users', 'providers', 'categories', 'subcategories', 'services', 'provider_services', 'bookings', 'wallets', 'wallet_transactions', 'conversations', 'messages', 'notifications', 'reviews'];
    for (const t of tables) {
      const countRes = await client.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`Table '${t}': ${countRes.rows[0].count} rows`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, transaction rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
