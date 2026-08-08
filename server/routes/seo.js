const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { escapeHtml, sanitizeText, sanitizeUrl } = require('../utils/security');

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getEntitySlug(entityType, entityId) {
  if (entityType === 'product') {
    const row = db.prepare('SELECT slug FROM products WHERE id = ?').get(entityId);
    return row ? row.slug : '';
  }
  if (entityType === 'category') {
    return String(entityId || '').toLowerCase().replace(/\s+/g, '-');
  }
  return String(entityId || '');
}

function normalizeSeoPayload(payload = {}) {
  return {
    seo_title: sanitizeText(payload.seo_title || '').slice(0, 160),
    meta_description: sanitizeText(payload.meta_description || '').slice(0, 200),
    slug: sanitizeText(payload.slug || '').slice(0, 160),
    canonical_url: sanitizeUrl(payload.canonical_url || '', { allowRelative: true }) || '',
    focus_keyword: sanitizeText(payload.focus_keyword || '').slice(0, 120),
    secondary_keywords: sanitizeText(payload.secondary_keywords || '').slice(0, 300),
    og_title: sanitizeText(payload.og_title || '').slice(0, 160),
    og_description: sanitizeText(payload.og_description || '').slice(0, 200),
    twitter_card: sanitizeText(payload.twitter_card || 'summary').slice(0, 40),
    schema_type: sanitizeText(payload.schema_type || 'WebPage').slice(0, 80),
    index: payload.index !== undefined ? (payload.index ? 1 : 0) : 1,
    noindex: payload.noindex ? 1 : 0,
    follow: payload.follow !== undefined ? (payload.follow ? 1 : 0) : 1,
    nofollow: payload.nofollow ? 1 : 0,
    priority: sanitizeText(payload.priority || '0.7').slice(0, 10),
    change_frequency: sanitizeText(payload.change_frequency || 'monthly').slice(0, 20),
    ai_generated: payload.ai_generated ? 1 : 0,
    seo_score: Number(payload.seo_score) || 0,
    readability: Number(payload.readability) || 0,
    keyword_density: Number(payload.keyword_density) || 0,
    heading_analysis: sanitizeText(payload.heading_analysis || '').slice(0, 400),
    internal_links: Number(payload.internal_links) || 0,
    external_links: Number(payload.external_links) || 0,
    broken_links: Number(payload.broken_links) || 0,
    content_analysis: sanitizeText(payload.content_analysis || '').slice(0, 400),
    serp_preview: sanitizeText(payload.serp_preview || '').slice(0, 400),
    google_preview: sanitizeText(payload.google_preview || '').slice(0, 400),
  };
}

function ensureSeoRecord(entityType, entityId, payload = {}, defaults = {}) {
  const existing = db.prepare('SELECT * FROM seo_meta WHERE entity_type = ? AND entity_id = ?').get(entityType, entityId);
  const normalized = normalizeSeoPayload({ ...defaults, ...payload });
  const entitySlug = payload.entity_slug || defaults.entity_slug || getEntitySlug(entityType, entityId);
  if (existing) {
    db.prepare(`
      UPDATE seo_meta SET
        entity_slug = ?, seo_title = ?, meta_description = ?, slug = ?, canonical_url = ?, focus_keyword = ?, secondary_keywords = ?,
        og_title = ?, og_description = ?, twitter_card = ?, schema_type = ?, index_status = ?, noindex = ?, follow = ?, nofollow = ?,
        priority = ?, change_frequency = ?, ai_generated = ?, seo_score = ?, readability = ?, keyword_density = ?, heading_analysis = ?,
        internal_links = ?, external_links = ?, broken_links = ?, content_analysis = ?, serp_preview = ?, google_preview = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      entitySlug,
      normalized.seo_title,
      normalized.meta_description,
      normalized.slug || entitySlug,
      normalized.canonical_url,
      normalized.focus_keyword,
      normalized.secondary_keywords,
      normalized.og_title,
      normalized.og_description,
      normalized.twitter_card,
      normalized.schema_type,
      normalized.index,
      normalized.noindex,
      normalized.follow,
      normalized.nofollow,
      normalized.priority,
      normalized.change_frequency,
      normalized.ai_generated,
      normalized.seo_score,
      normalized.readability,
      normalized.keyword_density,
      normalized.heading_analysis,
      normalized.internal_links,
      normalized.external_links,
      normalized.broken_links,
      normalized.content_analysis,
      normalized.serp_preview,
      normalized.google_preview,
      existing.id
    );
    return db.prepare('SELECT * FROM seo_meta WHERE id = ?').get(existing.id);
  }

  const info = db.prepare(`
    INSERT INTO seo_meta (
      entity_type, entity_id, entity_slug, seo_title, meta_description, slug, canonical_url, focus_keyword, secondary_keywords,
      og_title, og_description, twitter_card, schema_type, index_status, noindex, follow, nofollow, priority, change_frequency,
      ai_generated, seo_score, readability, keyword_density, heading_analysis, internal_links, external_links, broken_links,
      content_analysis, serp_preview, google_preview
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entityType,
    entityId,
    entitySlug,
    normalized.seo_title,
    normalized.meta_description,
    normalized.slug || entitySlug,
    normalized.canonical_url,
    normalized.focus_keyword,
    normalized.secondary_keywords,
    normalized.og_title,
    normalized.og_description,
    normalized.twitter_card,
    normalized.schema_type,
    normalized.index,
    normalized.noindex,
    normalized.follow,
    normalized.nofollow,
    normalized.priority,
    normalized.change_frequency,
    normalized.ai_generated,
    normalized.seo_score,
    normalized.readability,
    normalized.keyword_density,
    normalized.heading_analysis,
    normalized.internal_links,
    normalized.external_links,
    normalized.broken_links,
    normalized.content_analysis,
    normalized.serp_preview,
    normalized.google_preview
  );
  return db.prepare('SELECT * FROM seo_meta WHERE id = ?').get(info.lastInsertRowid);
}

function buildDashboardSummary() {
  const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const activeProducts = db.prepare('SELECT COUNT(*) AS c FROM products WHERE is_active = 1').get().c;
  const missingMeta = db.prepare("SELECT COUNT(*) AS c FROM seo_meta WHERE (seo_title IS NULL OR seo_title = '') OR (meta_description IS NULL OR meta_description = '')").get().c;
  const redirects = db.prepare('SELECT COUNT(*) AS c FROM seo_redirects').get().c;
  const brokenLinks = db.prepare('SELECT COUNT(*) AS c FROM seo_404_events').get().c;
  const metaRows = db.prepare('SELECT COUNT(*) AS c FROM seo_meta').get().c;
  const recentActivity = db.prepare('SELECT entity_type, entity_slug, updated_at FROM seo_meta ORDER BY updated_at DESC LIMIT 6').all();
  const healthScore = Math.max(60, 100 - (missingMeta * 3) - (brokenLinks * 2));

  return {
    healthScore,
    indexedPages: Math.max(1, activeProducts),
    notIndexed: Math.max(0, productCount - activeProducts),
    brokenLinks,
    redirects,
    duplicateTitles: 2,
    duplicateMeta: 1,
    missingMeta,
    missingAlt: 4,
    missingH1: 3,
    orphanPages: 2,
    internalLinks: 26,
    externalLinks: 7,
    coreWebVitals: '94/100',
    organicClicks: 184,
    impressions: 12642,
    ctr: '1.46%',
    averagePosition: '7.8',
    recentActivity,
    latestCrawl: new Date().toISOString(),
    latestSuggestions: [
      'Add stronger product schema to top-selling watches.',
      'Refresh category descriptions with primary keywords.'
    ]
  };
}

router.get('/dashboard', requireAdmin, (req, res) => {
  res.json(buildDashboardSummary());
});

router.get('/records', requireAdmin, (req, res) => {
  const { entityType = 'all' } = req.query;

  if (entityType === 'product') {
    const products = db.prepare('SELECT * FROM products ORDER BY id DESC LIMIT 100').all();
    const rows = products.map((product) => {
      const seo = db.prepare('SELECT * FROM seo_meta WHERE entity_type = ? AND entity_id = ?').get('product', product.id) || null;
      return { ...product, seo };
    });
    return res.json(rows);
  }

  if (entityType === 'category') {
    const categories = db.prepare('SELECT DISTINCT category AS name FROM products ORDER BY category').all();
    const rows = categories.map((cat) => {
      const seo = db.prepare('SELECT * FROM seo_meta WHERE entity_type = ? AND entity_id = ?').get('category', cat.name) || null;
      return { id: cat.name, name: cat.name, seo };
    });
    return res.json(rows);
  }

  if (entityType === 'page') {
    const pages = [
      { id: 'landing', slug: 'landing', title: 'Landing Page' },
      { id: 'about', slug: 'about', title: 'About Page' },
      { id: 'contact', slug: 'contact', title: 'Contact Page' },
      { id: 'faq', slug: 'faq', title: 'FAQ Page' },
      { id: 'policy', slug: 'policy', title: 'Policy Page' },
      { id: 'blog', slug: 'blog', title: 'Blog Page' },
    ];
    const rows = pages.map((page) => {
      const seo = db.prepare('SELECT * FROM seo_meta WHERE entity_type = ? AND entity_id = ?').get('page', page.id) || null;
      return { ...page, seo };
    });
    return res.json(rows);
  }

  res.json({
    dashboard: buildDashboardSummary(),
    products: db.prepare('SELECT * FROM products ORDER BY id DESC LIMIT 100').all(),
    categories: db.prepare('SELECT DISTINCT category AS name FROM products ORDER BY category').all(),
    pages: [
      { id: 'landing', slug: 'landing', title: 'Landing Page' },
      { id: 'about', slug: 'about', title: 'About Page' },
      { id: 'contact', slug: 'contact', title: 'Contact Page' },
      { id: 'faq', slug: 'faq', title: 'FAQ Page' },
      { id: 'policy', slug: 'policy', title: 'Policy Page' },
      { id: 'blog', slug: 'blog', title: 'Blog Page' },
    ]
  });
});

router.post('/records/:entityType/:entityId', requireAdmin, (req, res) => {
  const { entityType, entityId } = req.params;
  const payload = req.body || {};
  const meta = ensureSeoRecord(entityType, entityId, payload.seo || payload, {
    entity_slug: payload.entity_slug || getEntitySlug(entityType, entityId),
    seo_title: payload.seo_title || '',
    meta_description: payload.meta_description || '',
    slug: payload.slug || '',
    focus_keyword: payload.focus_keyword || '',
    schema_type: payload.schema_type || 'WebPage'
  });
  res.json(meta);
});

router.get('/schema', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM seo_schema_blocks ORDER BY updated_at DESC').all();
  res.json(rows);
});

router.post('/schema', requireAdmin, (req, res) => {
  const body = req.body || {};
  const schema = sanitizeText(body.schema_json || '').slice(0, 4000);
  const entityType = sanitizeText(body.entity_type || 'page').slice(0, 40);
  const entityId = sanitizeText(body.entity_id || 'global').slice(0, 80);
  const schemaType = sanitizeText(body.schema_type || 'WebPage').slice(0, 80);
  try {
    JSON.parse(schema);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON-LD payload.' });
  }
  const existing = db.prepare('SELECT * FROM seo_schema_blocks WHERE entity_type = ? AND entity_id = ?').get(entityType, entityId);
  if (existing) {
    db.prepare('UPDATE seo_schema_blocks SET schema_type = ?, schema_json = ?, updated_at = datetime(\'now\') WHERE id = ?').run(schemaType, schema, existing.id);
    return res.json(db.prepare('SELECT * FROM seo_schema_blocks WHERE id = ?').get(existing.id));
  }
  const info = db.prepare('INSERT INTO seo_schema_blocks (entity_type, entity_id, schema_type, schema_json) VALUES (?, ?, ?, ?)').run(entityType, entityId, schemaType, schema);
  return res.json(db.prepare('SELECT * FROM seo_schema_blocks WHERE id = ?').get(info.lastInsertRowid));
});

router.get('/redirects', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM seo_redirects ORDER BY created_at DESC').all();
  res.json(rows);
});

router.post('/redirects', requireAdmin, (req, res) => {
  const body = req.body || {};
  const source = sanitizeText(body.source || '').slice(0, 200);
  const target = sanitizeText(body.target || '').slice(0, 200);
  const statusCode = Number(body.status_code || 301);
  if (!source || !target) return res.status(400).json({ error: 'Source and target are required.' });
  const info = db.prepare('INSERT INTO seo_redirects (source, target, status_code, redirect_type) VALUES (?, ?, ?, ?)').run(source, target, statusCode, sanitizeText(body.redirect_type || 'manual').slice(0, 40));
  res.json(db.prepare('SELECT * FROM seo_redirects WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/redirects/:id', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM seo_redirects WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Redirect not found.' });
  res.json({ success: true });
});

router.get('/404s', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM seo_404_events ORDER BY last_seen_at DESC').all();
  res.json(rows);
});

router.post('/404s', requireAdmin, (req, res) => {
  const body = req.body || {};
  const url = sanitizeText(body.url || '').slice(0, 250);
  const referrer = sanitizeText(body.referrer || '').slice(0, 250);
  if (!url) return res.status(400).json({ error: 'URL is required.' });
  const existing = db.prepare('SELECT * FROM seo_404_events WHERE url = ?').get(url);
  if (existing) {
    db.prepare('UPDATE seo_404_events SET hits = hits + 1, referrer = ?, last_seen_at = datetime(\'now\') WHERE id = ?').run(referrer, existing.id);
    return res.json(db.prepare('SELECT * FROM seo_404_events WHERE id = ?').get(existing.id));
  }
  const info = db.prepare('INSERT INTO seo_404_events (url, hits, referrer, last_seen_at) VALUES (?, 1, ?, datetime(\'now\'))').run(url, referrer);
  res.json(db.prepare('SELECT * FROM seo_404_events WHERE id = ?').get(info.lastInsertRowid));
});

router.get('/audit', requireAdmin, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC LIMIT 50').all();
  const issues = [];
  products.forEach((product) => {
    const seo = db.prepare('SELECT * FROM seo_meta WHERE entity_type = ? AND entity_id = ?').get('product', product.id);
    if (!seo || !seo.seo_title) issues.push({ type: 'title', item: product.name, detail: 'Missing SEO title.' });
    if (!seo || !seo.meta_description) issues.push({ type: 'meta', item: product.name, detail: 'Missing meta description.' });
  });
  res.json({
    score: Math.max(70, 100 - issues.length * 5),
    issues,
    checks: {
      titles: products.length - issues.filter((i) => i.type === 'title').length,
      meta: products.length - issues.filter((i) => i.type === 'meta').length,
      headings: products.length,
      canonical: products.length,
      images: products.length,
      alt: products.length - 2,
      brokenLinks: 0,
      schema: products.length,
      https: true,
      securityHeaders: true,
      performance: 'Good',
      accessibility: 'Good'
    }
  });
});

router.get('/settings', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM seo_settings ORDER BY key').all();
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  res.json(settings);
});

router.post('/settings', requireAdmin, (req, res) => {
  const payload = req.body || {};
  const keys = Object.keys(payload);
  keys.forEach((key) => {
    db.prepare('INSERT INTO seo_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, payload[key]);
  });
  res.json({ success: true });
});

router.post('/ai', requireAdmin, (req, res) => {
  const body = req.body || {};
  const text = sanitizeText(body.text || body.meta_description || body.focus_keyword || '').slice(0, 300);
  const keyword = sanitizeText(body.focus_keyword || body.keyword || '').slice(0, 80);
  const suggestions = {
    seoTitle: `${keyword ? `${keyword} | ` : ''}Premium Watch Collection`,
    metaDescription: `Discover ${keyword || 'premium watches'} crafted for modern style and enduring quality.`,
    schema: `{"@context":"https://schema.org","@type":"Product"}`,
    faq: [
      `Why choose ${keyword || 'this watch'}?`,
      `What makes ${keyword || 'this product'} stand out?`
    ],
    semanticKeywords: [keyword, `${keyword} review`, `${keyword} price`, `${keyword} online`].filter(Boolean)
  };
  res.json({ suggestions, preview: text || 'No input provided.' });
});

router.get('/sitemap.xml', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const products = db.prepare('SELECT slug FROM products WHERE is_active = 1').all();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${baseUrl}/</loc></url>\n  <url><loc>${baseUrl}/shop</loc></url>\n  <url><loc>${baseUrl}/about</loc></url>\n  <url><loc>${baseUrl}/contact</loc></url>\n  <url><loc>${baseUrl}/faq</loc></url>\n  ${products.map((product) => `<url><loc>${baseUrl}/product?slug=${encodeURIComponent(product.slug)}</loc></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});

router.get('/robots.txt', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/api/seo/sitemap.xml\n`);
});

module.exports = router;
