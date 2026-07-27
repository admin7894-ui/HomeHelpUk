const fs = require('fs');
const path = require('path');
const db = require('../db');
const { SERVICE_MEDIA_CATALOG } = require('../../mobile/src/utils/serviceImages');

async function migrateAdminServices() {
  console.log('=== STARTING ADMIN SERVICE CATALOGUE MIGRATION ===\n');

  try {
    // 1. ALTER TABLE ENHANCEMENTS FOR ADMIN MANAGEMENT
    console.log('1. Enhancing database schema for Admin Service Management...');
    
    await db.query(`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
      
      ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE services ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
      ALTER TABLE services ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
      ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE services ADD COLUMN IF NOT EXISTS customer_requirements JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE services ADD COLUMN IF NOT EXISTS provider_eligibility JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE services ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
    `);
    console.log('✅ Database schema enhanced successfully!');

    // 2. READ CANONICAL CATEGORIES JSON
    const catJsonPath = path.join(__dirname, '../data/categories.json');
    const categoriesData = JSON.parse(fs.readFileSync(catJsonPath, 'utf8'));

    console.log(`\n2. Migrating ${categoriesData.length} categories into PostgreSQL database...`);

    let catIndex = 0;
    let srvIndex = 0;

    for (const cat of categoriesData) {
      catIndex++;
      // Upsert Category
      await db.query(
        `INSERT INTO categories (id, name, icon, price, unit, description, is_active, is_archived, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           icon = EXCLUDED.icon,
           price = EXCLUDED.price,
           unit = EXCLUDED.unit,
           description = EXCLUDED.description,
           order_index = EXCLUDED.order_index;`,
        [
          cat.id,
          cat.name,
          cat.icon || 'build-outline',
          Number(cat.price) || 0,
          cat.unit || 'hr',
          cat.description || '',
          cat.isActive !== false,
          false,
          catIndex
        ]
      );

      for (const sub of (cat.subcategories || [])) {
        // Upsert Subcategory
        await db.query(
          `INSERT INTO subcategories (id, category_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET
             category_id = EXCLUDED.category_id,
             name = EXCLUDED.name;`,
          [sub.id, cat.id, sub.name]
        );

        for (const srv of (sub.services || [])) {
          srvIndex++;
          // Obtain cover image from catalog if available
          const catalogMedia = SERVICE_MEDIA_CATALOG[srv.id];
          const coverImageUrl = srv.imageUrl || (catalogMedia ? catalogMedia.cover : 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80');

          // Default customer requirements sample if empty
          const customerRequirements = srv.customerRequirements || [
            {
              id: 'req_notes',
              key: 'notes',
              question: 'Specific instructions or access notes for provider',
              type: 'text',
              required: false
            }
          ];

          // Default provider eligibility sample
          const providerEligibility = srv.providerEligibility || {
            requiredCategory: cat.id,
            requiredCertifications: srv.certification && !srv.certification.toLowerCase().includes('no') ? [srv.certification] : [],
            requiredInsurance: true,
            requiredEquipment: srv.name.toLowerCase().includes('clean') ? ['Microfiber cloths', 'Cleaning spray'] : []
          };

          await db.query(
            `INSERT INTO services (
               id, subcategory_id, category_id, name, price, unit, duration, description,
               base_includes, additional_charge, max_quantity, whats_included, whats_not_included,
               addons, faqs, pricing_rules, dynamic_pricing, is_active, is_visible, is_archived,
               image_url, customer_requirements, provider_eligibility, order_index
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
             ON CONFLICT (id) DO UPDATE SET
               subcategory_id = EXCLUDED.subcategory_id,
               category_id = EXCLUDED.category_id,
               name = EXCLUDED.name,
               price = EXCLUDED.price,
               unit = EXCLUDED.unit,
               duration = EXCLUDED.duration,
               description = EXCLUDED.description,
               base_includes = EXCLUDED.base_includes,
               additional_charge = EXCLUDED.additional_charge,
               max_quantity = EXCLUDED.max_quantity,
               whats_included = EXCLUDED.whats_included,
               whats_not_included = EXCLUDED.whats_not_included,
               addons = EXCLUDED.addons,
               faqs = EXCLUDED.faqs,
               pricing_rules = EXCLUDED.pricing_rules,
               dynamic_pricing = EXCLUDED.dynamic_pricing,
               image_url = EXCLUDED.image_url,
               customer_requirements = EXCLUDED.customer_requirements,
               provider_eligibility = EXCLUDED.provider_eligibility,
               order_index = EXCLUDED.order_index;`,
            [
              srv.id,
              sub.id,
              cat.id,
              srv.name,
              Number(srv.price) || 0,
              srv.unit || 'visit',
              srv.duration || '1-2 hrs',
              srv.description || '',
              srv.baseIncludes || '',
              Number(srv.additionalCharge) || 0,
              srv.maxQuantity || 10,
              JSON.stringify(srv.whatsIncluded || []),
              JSON.stringify(srv.whatsNotIncluded || []),
              JSON.stringify(srv.addons || srv.availableAddOns || []),
              JSON.stringify(srv.faqs || []),
              JSON.stringify(srv.pricingRules || {}),
              JSON.stringify(srv.dynamicPricing || {}),
              srv.isActive !== false,
              srv.isVisible !== false,
              Boolean(srv.isArchived),
              coverImageUrl,
              JSON.stringify(customerRequirements),
              JSON.stringify(providerEligibility),
              srvIndex
            ]
          );
        }
      }
    }

    console.log(`✅ Successfully migrated ${catIndex} categories and ${srvIndex} services into PostgreSQL!`);
  } catch (err) {
    console.error('❌ Migration Error:', err);
  } process.exit(0);
}

migrateAdminServices();
