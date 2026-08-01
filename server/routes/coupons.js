const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

// POST /api/coupons/validate (public) - checkout page checks a code before placing the order
router.post('/validate', (req, res) => {
  const { code, subtotal } = req.body;
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get((code || '').toUpperCase());
  if (!coupon) return res.status(404).json({ valid: false, error: 'Coupon code not found.' });
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    return res.status(400).json({ valid: false, error: 'This coupon has reached its usage limit.' });
  }
  if (subtotal < coupon.min_order) {
    return res.status(400).json({ valid: false, error: `Minimum order of ৳${coupon.min_order.toLocaleString()} required.` });
  }
  const discount = coupon.type === 'percent' ? Math.round(subtotal * coupon.value / 100) : coupon.value;
  res.json({ valid: true, code: coupon.code, type: coupon.type, value: coupon.value, discount });
});

// ---- Admin (protected) ----

router.get('/', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY id DESC').all());
});

router.post('/', requireAdmin, (req, res) => {
  const b = req.body;
  if (!b.code || !b.value) return res.status(400).json({ error: 'code and value are required.' });
  try {
    const info = db.prepare(`
      INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(b.code.toUpperCase(), b.type || 'percent', b.value, b.min_order || 0, b.max_uses || 0, b.expires_at || null);
    res.status(201).json(db.prepare('SELECT * FROM coupons WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    res.status(400).json({ error: 'Could not create coupon (code may already exist).' });
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const b = req.body;
  const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Coupon not found.' });
  db.prepare(`
    UPDATE coupons SET code=?, type=?, value=?, min_order=?, max_uses=?, expires_at=?, is_active=? WHERE id=?
  `).run(
    (b.code || existing.code).toUpperCase(), b.type ?? existing.type, b.value ?? existing.value,
    b.min_order ?? existing.min_order, b.max_uses ?? existing.max_uses, b.expires_at ?? existing.expires_at,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active, req.params.id
  );
  res.json(db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
