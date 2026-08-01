const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { escapeHtml, sanitizeText, sanitizeUrl } = require('../utils/security');

// GET /api/banners (public) - active banners for the homepage strip
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY position ASC').all());
});

// ---- Admin (protected) ----

router.get('/all', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM banners ORDER BY position ASC').all());
});

router.post('/', requireAdmin, (req, res) => {
  const title = sanitizeText(req.body?.title || '').slice(0, 120);
  const subtitle = sanitizeText(req.body?.subtitle || '').slice(0, 220);
  const ctaLabel = sanitizeText(req.body?.cta_label || '').slice(0, 80);
  const ctaLink = sanitizeUrl(req.body?.cta_link || '', { allowRelative: true });
  const position = Number.isInteger(Number(req.body?.position)) ? Number(req.body.position) : 0;
  if (!title) return res.status(400).json({ error: 'title is required.' });
  const info = db.prepare(`
    INSERT INTO banners (title, subtitle, cta_label, cta_link, position) VALUES (?, ?, ?, ?, ?)
  `).run(escapeHtml(title), escapeHtml(subtitle), escapeHtml(ctaLabel), ctaLink, position);
  res.status(201).json(db.prepare('SELECT * FROM banners WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Banner not found.' });
  const title = sanitizeText(req.body?.title ?? existing.title).slice(0, 120);
  const subtitle = sanitizeText(req.body?.subtitle ?? existing.subtitle).slice(0, 220);
  const ctaLabel = sanitizeText(req.body?.cta_label ?? existing.cta_label).slice(0, 80);
  const ctaLink = sanitizeUrl(req.body?.cta_link ?? existing.cta_link, { allowRelative: true });
  const position = Number.isInteger(Number(req.body?.position ?? existing.position)) ? Number(req.body?.position ?? existing.position) : existing.position;
  const isActive = req.body?.is_active !== undefined ? (req.body.is_active ? 1 : 0) : existing.is_active;
  db.prepare(`
    UPDATE banners SET title=?, subtitle=?, cta_label=?, cta_link=?, position=?, is_active=? WHERE id=?
  `).run(escapeHtml(title), escapeHtml(subtitle), escapeHtml(ctaLabel), ctaLink, position, isActive, req.params.id);
  res.json(db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
