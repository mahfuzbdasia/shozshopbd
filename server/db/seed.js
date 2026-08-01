// Populates the database with the 20 seed products, a default admin login,
// starter coupons and homepage banners. Safe to re-run (uses INSERT OR IGNORE
// for products, and skips admin creation if one already exists).
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');

const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.seed.json'), 'utf8'));

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products
  (sku, slug, name, category, price, old_price, movement, case_mm, strap, water_resist, description, image, stock, rating, reviews, is_new, is_bestseller)
  VALUES (@sku, @slug, @name, @category, @price, @old_price, @movement, @case_mm, @strap, @water_resist, @description, @image, @stock, @rating, @reviews, @is_new, @is_bestseller)
`);

const insertMany = db.transaction((rows) => {
  for (const p of rows) {
    insertProduct.run({ ...p, is_new: p.is_new ? 1 : 0, is_bestseller: p.is_bestseller ? 1 : 0 });
  }
});
insertMany(products);
console.log(`Seeded ${products.length} products (existing rows kept as-is).`);

// Default admin account
const existingAdmin = db.prepare('SELECT id FROM admins LIMIT 1').get();
if (!existingAdmin) {
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@sohozshopbd.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'change-me-strong-password';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)')
    .run('Store Admin', email, hash);
  console.log(`Created default admin -> email: ${email}`);
  console.log('Set DEFAULT_ADMIN_PASSWORD in your environment to control the initial admin login.');
} else {
  console.log('Admin account already exists, skipping.');
}

// Starter coupons
const couponCount = db.prepare('SELECT COUNT(*) as c FROM coupons').get().c;
if (couponCount === 0) {
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertCoupon.run('WELCOME10', 'percent', 10, 3000, 0, null);
  insertCoupon.run('SohozShopBD500', 'flat', 500, 8000, 0, null);
  console.log('Seeded starter coupons: WELCOME10, SohozShopBD500');
}

// Starter banners
const bannerCount = db.prepare('SELECT COUNT(*) as c FROM banners').get().c;
if (bannerCount === 0) {
  const insertBanner = db.prepare(`
    INSERT INTO banners (title, subtitle, cta_label, cta_link, position)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertBanner.run('New Arrivals', 'The Solstice and Celestia collections just landed.', 'Shop new arrivals', '/shop.html?filter=new', 1);
  insertBanner.run('Free shipping over ৳10,000', 'Nationwide delivery across Bangladesh, 2–5 business days.', 'Start shopping', '/shop.html', 2);
  console.log('Seeded starter banners.');
}

console.log('Seeding complete.');
