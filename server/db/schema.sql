-- HomeHelpUK Production PostgreSQL Schema

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(60) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'provider', 'admin')),
  avatar_url TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  verified_phone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS user_addresses (
  id VARCHAR(60) PRIMARY KEY,
  user_id VARCHAR(60) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_line TEXT NOT NULL,
  postcode VARCHAR(20),
  city VARCHAR(100),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. USER FAVOURITE PROVIDERS (Junction Table)
CREATE TABLE IF NOT EXISTS user_favourites (
  user_id VARCHAR(60) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id VARCHAR(60) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, provider_id)
);

-- 4. PROVIDERS TABLE
CREATE TABLE IF NOT EXISTS providers (
  id VARCHAR(60) PRIMARY KEY,
  user_id VARCHAR(60) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT DEFAULT '',
  postcode VARCHAR(20) DEFAULT '',
  service_radius_miles NUMERIC(5,2) DEFAULT 10.0,
  rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 0.0 AND rating <= 5.0),
  review_count INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  completed_jobs INT DEFAULT 0,
  vacation_mode BOOLEAN DEFAULT FALSE,
  emergency_unavailable BOOLEAN DEFAULT FALSE,
  weekly_availability JSONB DEFAULT '{}'::jsonb,
  holidays JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '{}'::jsonb,
  bank_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Foreign Key Constraint for user_favourites to providers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_favourites_provider'
  ) THEN
    ALTER TABLE user_favourites 
      ADD CONSTRAINT fk_user_favourites_provider 
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(60) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(100),
  price NUMERIC(10,2) DEFAULT 0,
  unit VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS subcategories (
  id VARCHAR(60) PRIMARY KEY,
  category_id VARCHAR(60) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. SERVICES TABLE (Canonical Catalog)
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(60) PRIMARY KEY,
  subcategory_id VARCHAR(60) REFERENCES subcategories(id) ON DELETE SET NULL,
  category_id VARCHAR(60) REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'visit',
  duration VARCHAR(100),
  description TEXT,
  base_includes TEXT,
  additional_charge NUMERIC(10,2) DEFAULT 0,
  max_quantity INT DEFAULT 1,
  whats_included JSONB DEFAULT '[]'::jsonb,
  whats_not_included JSONB DEFAULT '[]'::jsonb,
  addons JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  pricing_rules JSONB DEFAULT '{}'::jsonb,
  dynamic_pricing JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. PROVIDER CATEGORIES (Junction Table)
CREATE TABLE IF NOT EXISTS provider_categories (
  provider_id VARCHAR(60) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id VARCHAR(60) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, category_id)
);

-- 9. PROVIDER SERVICES TABLE (Provider Customizations)
CREATE TABLE IF NOT EXISTS provider_services (
  id VARCHAR(60) PRIMARY KEY,
  provider_id VARCHAR(60) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id VARCHAR(60) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  custom_price NUMERIC(10,2),
  enabled BOOLEAN DEFAULT TRUE,
  custom_description TEXT,
  custom_whats_included JSONB,
  custom_whats_not_included JSONB,
  custom_addons JSONB,
  custom_faqs JSONB,
  pricing_rules JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, service_id)
);

-- 10. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(60) PRIMARY KEY,
  customer_id VARCHAR(60) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_id VARCHAR(60), -- can be NULL or 'open' or FK to providers(id)
  category_id VARCHAR(60) NOT NULL, -- references services(id) or categories(id)
  status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'assigned', 'en_route', 'in_progress', 'completed', 'cancelled')),
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  start_timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ NOT NULL,
  address TEXT NOT NULL,
  notes TEXT DEFAULT '',
  duration_hours NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  service_quantity INT NOT NULL DEFAULT 1,
  hourly_rate NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  service_fee NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  provider_payout NUMERIC(10,2) NOT NULL,
  platform_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 11.0,
  start_otp VARCHAR(10),
  completion_otp VARCHAR(10),
  photos JSONB DEFAULT '{}'::jsonb,
  pricing_breakdown JSONB,
  pricing_snapshot JSONB,
  decline_records JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON bookings(provider_id, start_timestamp, end_timestamp) WHERE status IN ('pending', 'assigned', 'en_route', 'in_progress', 'confirmed', 'accepted');

-- 11. WALLETS TABLE
CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(60) PRIMARY KEY,
  provider_id VARCHAR(60) UNIQUE NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
  pending_payouts NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (pending_payouts >= 0.00),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(60) PRIMARY KEY,
  wallet_id VARCHAR(60) NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  booking_id VARCHAR(60) REFERENCES bookings(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'payout', 'refund')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0.00),
  status VARCHAR(20) DEFAULT 'completed',
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_booking ON wallet_transactions(wallet_id, booking_id);

-- 13. CHATS / CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(60) PRIMARY KEY,
  booking_id VARCHAR(60) UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id VARCHAR(60) NOT NULL REFERENCES users(id),
  provider_id VARCHAR(60) NOT NULL, -- references providers(id)
  category_id VARCHAR(60) NOT NULL,
  service_name VARCHAR(255),
  booking_date DATE,
  booking_time VARCHAR(20),
  hidden_for JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(60) PRIMARY KEY,
  conversation_id VARCHAR(60) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(60) NOT NULL REFERENCES users(id),
  text TEXT DEFAULT '',
  image_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, timestamp);

-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(60) PRIMARY KEY,
  user_id VARCHAR(60) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- 16. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(60) PRIMARY KEY,
  booking_id VARCHAR(60) UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id VARCHAR(60) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_id VARCHAR(60) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
