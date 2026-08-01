const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { sanitizeText } = require('../utils/security');

// POST /api/newsletter (public) - footer email capture
router.post('/', (req, res) => {
  const email = sanitizeText(req.body?.email || '').toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email is required.' });
  try {
    db.prepare('INSERT INTO subscribers (email) VALUES (?)').run(email);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(200).json({ success: true, note: 'Already subscribed.' });
  }
});

// GET /api/newsletter (admin)
router.get('/', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all());
});

module.exports = router;
