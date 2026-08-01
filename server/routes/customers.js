const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

// GET /api/customers (admin)
router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, COUNT(o.id) as order_count, COALESCE(SUM(o.total), 0) as lifetime_value
    FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id ORDER BY c.id DESC
  `).all();
  res.json(rows);
});

// GET /api/customers/:id/orders (admin)
router.get('/:id/orders', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC').all(req.params.id);
  res.json(rows.map(o => ({ ...o, items_json: JSON.parse(o.items_json) })));
});

module.exports = router;
