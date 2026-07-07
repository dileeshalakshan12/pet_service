// db/schema.js — full relational schema. Every table has a primary key and
// foreign keys reference the users/providers tables, so orphaned rows are
// rejected at the database level rather than trusted to application code.
const db = require('./connection');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','provider','admin')),
  provider_id TEXT,
  avatar_text TEXT,
  created_at INTEGER NOT NULL,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  rating REAL DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  experience INTEGER DEFAULT 0,
  price_range TEXT DEFAULT '$',
  available_today INTEGER DEFAULT 0,
  cover TEXT,
  about TEXT,
  hours TEXT,
  followers INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  email TEXT
);

CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT,
  breed TEXT,
  age INTEGER,
  gender TEXT,
  weight TEXT,
  vaccinated TEXT,
  allergies TEXT,
  notes TEXT,
  photo_emoji TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category TEXT,
  title TEXT NOT NULL,
  desc TEXT,
  price REAL,
  duration INTEGER,
  image TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  pet_id TEXT REFERENCES pets(id) ON DELETE SET NULL,
  date TEXT,
  time TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  price REAL,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  author TEXT,
  rating INTEGER,
  text TEXT,
  date INTEGER,
  likes INTEGER DEFAULT 0
);

-- Provider marketplace promo posts (distinct from CMS blog articles below)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title TEXT,
  desc TEXT,
  image TEXT,
  category TEXT,
  price REAL,
  promo INTEGER DEFAULT 0,
  tags TEXT,
  likes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  text TEXT,
  at INTEGER
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT,
  text TEXT,
  read INTEGER DEFAULT 0,
  at INTEGER
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount INTEGER,
  expires TEXT
);

-- Blog CMS: written and published by admins through the no-code editor
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  body_html TEXT NOT NULL,
  cover_image TEXT,
  category TEXT,
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(owner_id);
`);

module.exports = db;
