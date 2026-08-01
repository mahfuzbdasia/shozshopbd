const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { requireAdmin, SECRET } = require('../middleware/auth');
const { sanitizeText } = require('../utils/security');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const email = sanitizeText(req.body?.email || '').toLowerCase();
  const password = sanitizeText(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, SECRET, { expiresIn: '12h', algorithm: 'HS256' });
  res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
});

// GET /api/auth/me
router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// POST /api/auth/change-password
router.post('/change-password', requireAdmin, (req, res) => {
  const currentPassword = sanitizeText(req.body?.currentPassword || '');
  const newPassword = sanitizeText(req.body?.newPassword || '');
  const confirmPassword = sanitizeText(req.body?.confirmPassword || '');

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Current password, new password and confirmation are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New password and confirmation do not match.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, admin.id);
  res.json({ success: true });
});

// GET /api/auth/dashboard - summary stats for the admin home
router.get('/dashboard', requireAdmin, (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) c FROM products WHERE is_active = 1').get().c;
  const lowStock = db.prepare('SELECT COUNT(*) c FROM products WHERE is_active = 1 AND stock <= 5').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'Pending'").get().c;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total),0) r FROM orders WHERE status != 'Cancelled'").get().r;
  const totalCustomers = db.prepare('SELECT COUNT(*) c FROM customers').get().c;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 6').all()
    .map(o => ({ ...o, items_json: JSON.parse(o.items_json) }));
  const topProducts = db.prepare('SELECT name, sku, stock, price, rating FROM products WHERE is_active = 1 ORDER BY rating DESC LIMIT 5').all();
  res.json({ totalProducts, lowStock, totalOrders, pendingOrders, totalRevenue, totalCustomers, recentOrders, topProducts });
});

module.exports = router;
