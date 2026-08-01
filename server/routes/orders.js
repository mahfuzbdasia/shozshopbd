const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { escapeHtml, sanitizeText, sanitizeUrl } = require('../utils/security');

function genOrderNo() {
  const y = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KRS-${y}-${rand}`;
}

// POST /api/orders (public) - place an order from the checkout page
router.post('/', (req, res) => {
  const b = req.body || {};
  const customerName = sanitizeText(b.customer_name || '').slice(0, 120);
  const customerPhone = sanitizeText(b.customer_phone || '').slice(0, 40);
  const shippingAddress = sanitizeText(b.shipping_address || '').slice(0, 500);
  const city = sanitizeText(b.city || '').slice(0, 120);
  const customerEmail = sanitizeText(b.customer_email || '').trim().toLowerCase() || `guest-${Date.now()}@local.invalid`;
  if (!customerName || !customerPhone || !shippingAddress || !Array.isArray(b.items) || b.items.length === 0) {
    return res.status(400).json({ error: 'Name, phone, address and at least one item are required.' });
  }
  const checkoutSettings = db.prepare('SELECT value FROM settings WHERE key = ?').get('checkout_settings');
  let locationSettings = { enableVerification: true };
  try { locationSettings = JSON.parse(checkoutSettings?.value || '{}'); } catch (err) { /* use secure defaults */ }
  const latitude = Number(b.latitude);
  const longitude = Number(b.longitude);
  if (locationSettings.enableVerification !== false && (!Number.isFinite(latitude) || !Number.isFinite(longitude))) {
    return res.status(400).json({ error: "We couldn't determine your delivery location. Please check your city or address." });
  }

  let subtotal = 0;
  const items = [];
  for (const it of b.items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(it?.id);
    if (!product) continue;
    const qty = Math.max(1, Number(it?.qty) || 1);
    subtotal += product.price * qty;
    items.push({ id: product.id, name: escapeHtml(product.name), sku: product.sku, price: product.price, qty, image: sanitizeUrl(product.image, { allowRelative: true }) || '/images/products/meridian-steel.svg' });
  }
  if (items.length === 0) return res.status(400).json({ error: 'No valid items in cart.' });

  let discount = 0;
  let couponCode = null;
  if (b.coupon_code) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(String(b.coupon_code).toUpperCase());
    if (coupon && subtotal >= coupon.min_order && (coupon.max_uses === 0 || coupon.used_count < coupon.max_uses)) {
      discount = coupon.type === 'percent' ? Math.round(subtotal * coupon.value / 100) : coupon.value;
      couponCode = coupon.code;
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(coupon.id);
    }
  }

  const shippingFee = subtotal - discount >= 10000 ? 0 : 120;
  const total = subtotal - discount + shippingFee;

  // upsert customer
  let customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(customerEmail);
  if (!customer) {
    const info = db.prepare('INSERT INTO customers (name, email, phone, address, city) VALUES (?, ?, ?, ?, ?)')
      .run(escapeHtml(customerName), customerEmail, escapeHtml(customerPhone), escapeHtml(shippingAddress), escapeHtml(city));
    customer = { id: info.lastInsertRowid };
  } else {
    db.prepare('UPDATE customers SET name=?, phone=?, address=?, city=? WHERE id=?')
      .run(escapeHtml(customerName), escapeHtml(customerPhone), escapeHtml(shippingAddress), escapeHtml(city), customer.id);
  }

  const orderNo = genOrderNo();
  const info = db.prepare(`
    INSERT INTO orders (order_no, customer_id, customer_name, customer_email, customer_phone, shipping_address, city,
      latitude, longitude, place_id, formatted_address, google_maps_url, postal_code, division, country, items_json, subtotal, discount, shipping_fee, total, coupon_code, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderNo, customer.id, escapeHtml(customerName), customerEmail, escapeHtml(customerPhone), escapeHtml(shippingAddress), escapeHtml(city),
    latitude, longitude, sanitizeText(b.place_id || '').slice(0, 200), escapeHtml(sanitizeText(b.formatted_address || '').slice(0, 500)), sanitizeUrl(b.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`), sanitizeText(b.postal_code || '').slice(0, 40), escapeHtml(sanitizeText(b.division || '').slice(0, 80)), escapeHtml(sanitizeText(b.country || '').slice(0, 80)), JSON.stringify(items), subtotal, discount, shippingFee, total, couponCode, 'Cash on Delivery'
  );

  // decrement stock
  const decStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
  for (const it of items) decStock.run(it.qty, it.id);

  res.status(201).json({
    order_no: orderNo, id: info.lastInsertRowid, subtotal, discount, shipping_fee: shippingFee, total, items,
  });
});

// GET /api/orders/track/:order_no (public) - order status lookup
router.get('/track/:order_no', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(req.params.order_no);
  if (!order) return res.status(404).json({ error: 'No order found with that number.' });
  order.items_json = JSON.parse(order.items_json);
  res.json(order);
});

// ---- Admin (protected) ----

// GET /api/orders (admin) - list all, newest first
router.get('/', requireAdmin, (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY id DESC';
  const rows = db.prepare(sql).all(...params).map(o => ({ ...o, items_json: JSON.parse(o.items_json) }));
  res.json(rows);
});

// PUT /api/orders/:id/status (admin)
router.put('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const valid = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
  const info = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Order not found.' });
  res.json({ success: true });
});

module.exports = router;
