const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { escapeHtml, sanitizeText } = require('../utils/security');

// POST /api/contact (public) - contact page form
router.post('/', (req, res) => {
  const name = sanitizeText(req.body?.name || '').slice(0, 100);
  const email = sanitizeText(req.body?.email || '').toLowerCase();
  const subject = sanitizeText(req.body?.subject || '').slice(0, 200);
  const message = sanitizeText(req.body?.message || '').slice(0, 2000);
  if (!name || !email.includes('@') || !message) return res.status(400).json({ error: 'Name, email and message are required.' });
  db.prepare('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)').run(
    escapeHtml(name), email, escapeHtml(subject), escapeHtml(message)
  );
  res.status(201).json({ success: true });
});

// GET /api/contact (admin) - view submitted messages
router.get('/', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM messages ORDER BY id DESC').all());
});

router.put('/:id/read', requireAdmin, (req, res) => {
  db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
