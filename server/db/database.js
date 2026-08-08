// SQLite connection + schema bootstrap for the SohozShopBD store.
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'kairos.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  old_price INTEGER,
  movement TEXT,
  case_mm INTEGER,
  strap TEXT,
  water_resist TEXT,
  description TEXT,
  image TEXT,
  gallery_json TEXT DEFAULT '[]',
  stock INTEGER DEFAULT 0,
  rating REAL DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  is_bestseller INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT,
  city TEXT,
  delivery_district TEXT,
  delivery_charge INTEGER DEFAULT 0,
  latitude REAL,
  longitude REAL,
  place_id TEXT,
  formatted_address TEXT,
  google_maps_url TEXT,
  items_json TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  shipping_fee INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  coupon_code TEXT,
  payment_method TEXT DEFAULT 'Cash on Delivery',
  status TEXT DEFAULT 'Pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'percent',
  value INTEGER NOT NULL,
  min_order INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  expires_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  cta_link TEXT,
  position INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seo_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_slug TEXT,
  seo_title TEXT,
  meta_description TEXT,
  slug TEXT,
  canonical_url TEXT,
  focus_keyword TEXT,
  secondary_keywords TEXT,
  breadcrumb_title TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  twitter_card TEXT,
  schema_type TEXT,
  schema_json TEXT,
  image_alt TEXT,
  image_title TEXT,
  image_caption TEXT,
  image_filename TEXT,
  image_status TEXT,
  compression_status TEXT,
  index_status INTEGER DEFAULT 1,
  noindex INTEGER DEFAULT 0,
  follow INTEGER DEFAULT 1,
  nofollow INTEGER DEFAULT 0,
  priority TEXT DEFAULT '0.7',
  change_frequency TEXT DEFAULT 'monthly',
  ai_generated INTEGER DEFAULT 0,
  seo_score INTEGER DEFAULT 0,
  readability INTEGER DEFAULT 0,
  keyword_density INTEGER DEFAULT 0,
  heading_analysis TEXT,
  internal_links INTEGER DEFAULT 0,
  external_links INTEGER DEFAULT 0,
  broken_links INTEGER DEFAULT 0,
  content_analysis TEXT,
  serp_preview TEXT,
  google_preview TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seo_schema_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  schema_type TEXT,
  schema_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seo_redirects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  status_code INTEGER DEFAULT 301,
  redirect_type TEXT DEFAULT 'manual',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seo_404_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  hits INTEGER DEFAULT 1,
  referrer TEXT,
  last_seen_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seo_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

try { db.exec("ALTER TABLE products ADD COLUMN gallery_json TEXT DEFAULT '[]'"); } catch (err) { /* existing databases already have the column */ }
for (const column of [
  'breadcrumb_title TEXT',
  'og_image TEXT',
  'twitter_title TEXT',
  'twitter_description TEXT',
  'twitter_image TEXT',
  'schema_json TEXT',
  'image_alt TEXT',
  'image_title TEXT',
  'image_caption TEXT',
  'image_filename TEXT',
  'image_status TEXT',
  'compression_status TEXT'
]) {
  try { db.exec(`ALTER TABLE seo_meta ADD COLUMN ${column}`); } catch (err) { /* existing databases already have the column */ }
}
for (const column of ['delivery_district TEXT', 'delivery_charge INTEGER DEFAULT 0', 'latitude REAL', 'longitude REAL', 'place_id TEXT', 'formatted_address TEXT', 'postal_code TEXT', 'division TEXT', 'country TEXT']) {
  try { db.exec(`ALTER TABLE orders ADD COLUMN ${column}`); } catch (err) { /* existing databases already have the column */ }
}
try { db.exec('ALTER TABLE orders ADD COLUMN google_maps_url TEXT'); } catch (err) { /* existing databases already have the column */ }

const defaultCities = [
  'Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh',
  "Cox's Bazar", 'Cumilla', 'Gazipur', 'Narayanganj', 'Bogra', 'Dinajpur', 'Jessore', 'Savar',
  'Tongi', 'Narsingdi', 'Tangail', 'Pabna', 'Kushtia', 'Feni', 'Noakhali', 'Brahmanbaria',
];
db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('checkout_settings', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at").run(JSON.stringify({
  enableMap: true,
  enableVerification: true,
  provider: 'google',
  apiKey: '',
  center: { lat: 23.685, lon: 90.3563 },
  zoom: 7,
  cities: defaultCities,
}));

db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES ('product_badges', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(JSON.stringify({
  enabled: true,
  position: 'top-left',
}));

module.exports = db;
