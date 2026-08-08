const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { escapeHtml, sanitizeText, sanitizeUrl } = require('../utils/security');

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function nextSku() {
  const row = db.prepare('SELECT sku FROM products ORDER BY id DESC LIMIT 1').get();
  const n = row ? parseInt(row.sku.split('-')[1], 10) + 1 : 1;
  return `KRS-${String(n).padStart(3, '0')}`;
}
function withGallery(product) {
  let gallery = [];
  try { gallery = JSON.parse(product.gallery_json || '[]'); } catch (err) { gallery = []; }
  const seo = db.prepare('SELECT * FROM seo_meta WHERE entity_type = ? AND entity_id = ?').get('product', String(product.id)) || null;
  return { ...product, gallery: Array.isArray(gallery) ? gallery.slice(0, 5) : [], seo };
}
function galleryValue(value, fallback = '[]') {
  if (Array.isArray(value)) return JSON.stringify(value.filter(Boolean).slice(0, 5));
  return value === undefined ? fallback : '[]';
}
function upsertProductSeo(productId, seoPayload = {}) {
  const payload = seoPayload || {};
  const existing = db.prepare('SELECT * FROM seo_meta WHERE entity_type = ? AND entity_id = ?').get('product', String(productId));
  const seoTitle = sanitizeText(payload.seo_title || '').slice(0, 160);
  const metaDescription = sanitizeText(payload.meta_description || '').slice(0, 200);
  const slug = sanitizeText(payload.slug || '').slice(0, 160);
  const focusKeyword = sanitizeText(payload.focus_keyword || '').slice(0, 120);
  const canonicalUrl = sanitizeUrl(payload.canonical_url || '', { allowRelative: true }) || '';
  const secondaryKeywords = sanitizeText(payload.secondary_keywords || '').slice(0, 300);
  const breadcrumbTitle = sanitizeText(payload.breadcrumb_title || '').slice(0, 160);
  const ogTitle = sanitizeText(payload.og_title || '').slice(0, 160);
  const ogDescription = sanitizeText(payload.og_description || '').slice(0, 200);
  const ogImage = sanitizeUrl(payload.og_image || '', { allowRelative: true }) || '';
  const twitterTitle = sanitizeText(payload.twitter_title || '').slice(0, 160);
  const twitterDescription = sanitizeText(payload.twitter_description || '').slice(0, 200);
  const twitterImage = sanitizeUrl(payload.twitter_image || '', { allowRelative: true }) || '';
  const twitterCard = sanitizeText(payload.twitter_card || 'summary').slice(0, 40);
  const schemaType = sanitizeText(payload.schema_type || 'Product').slice(0, 80);
  const schemaJson = sanitizeText(payload.schema_json || '').slice(0, 4000);
  const imageAlt = sanitizeText(payload.image_alt || '').slice(0, 160);
  const imageTitle = sanitizeText(payload.image_title || '').slice(0, 160);
  const imageCaption = sanitizeText(payload.image_caption || '').slice(0, 160);
  const imageFilename = sanitizeText(payload.image_filename || '').slice(0, 200);
  const imageStatus = sanitizeText(payload.image_status || 'Ready').slice(0, 80);
  const compressionStatus = sanitizeText(payload.compression_status || 'Optimized').slice(0, 80);
  const priority = sanitizeText(payload.priority || '0.7').slice(0, 10);
  const changeFrequency = sanitizeText(payload.change_frequency || 'monthly').slice(0, 20);
  const headingAnalysis = sanitizeText(payload.heading_analysis || '').slice(0, 400);
  const contentAnalysis = sanitizeText(payload.content_analysis || '').slice(0, 400);
  const serpPreview = sanitizeText(payload.serp_preview || '').slice(0, 400);
  const googlePreview = sanitizeText(payload.google_preview || '').slice(0, 400);
  const seoScore = Number(payload.seo_score) || 0;
  const readability = Number(payload.readability) || 0;
  const keywordDensity = Number(payload.keyword_density) || 0;
  const internalLinks = Number(payload.internal_links) || 0;
  const externalLinks = Number(payload.external_links) || 0;
  const brokenLinks = Number(payload.broken_links) || 0;

  if (existing) {
    db.prepare(`
      UPDATE seo_meta SET
        seo_title = ?, meta_description = ?, slug = ?, canonical_url = ?, focus_keyword = ?, secondary_keywords = ?,
        breadcrumb_title = ?, og_title = ?, og_description = ?, og_image = ?, twitter_title = ?, twitter_description = ?, twitter_image = ?,
        twitter_card = ?, schema_type = ?, schema_json = ?, image_alt = ?, image_title = ?, image_caption = ?, image_filename = ?, image_status = ?, compression_status = ?,
        index_status = ?, noindex = ?, follow = ?, nofollow = ?, priority = ?, change_frequency = ?, ai_generated = ?, seo_score = ?, readability = ?, keyword_density = ?, heading_analysis = ?,
        internal_links = ?, external_links = ?, broken_links = ?, content_analysis = ?, serp_preview = ?, google_preview = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      seoTitle, metaDescription, slug, canonicalUrl, focusKeyword, secondaryKeywords,
      breadcrumbTitle, ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription, twitterImage,
      twitterCard, schemaType, schemaJson, imageAlt, imageTitle, imageCaption, imageFilename, imageStatus, compressionStatus,
      payload.index !== undefined ? (payload.index ? 1 : 0) : 1,
      payload.noindex ? 1 : 0,
      payload.follow !== undefined ? (payload.follow ? 1 : 0) : 1,
      payload.nofollow ? 1 : 0,
      priority, changeFrequency, payload.ai_generated ? 1 : 0,
      seoScore, readability, keywordDensity, headingAnalysis,
      internalLinks, externalLinks, brokenLinks, contentAnalysis, serpPreview, googlePreview,
      existing.id
    );
    return db.prepare('SELECT * FROM seo_meta WHERE id = ?').get(existing.id);
  }

  const info = db.prepare(`
    INSERT INTO seo_meta (
      entity_type, entity_id, entity_slug, seo_title, meta_description, slug, canonical_url, focus_keyword, secondary_keywords,
      breadcrumb_title, og_title, og_description, og_image, twitter_title, twitter_description, twitter_image, twitter_card, schema_type, schema_json,
      image_alt, image_title, image_caption, image_filename, image_status, compression_status, index_status, noindex, follow, nofollow, priority, change_frequency,
      ai_generated, seo_score, readability, keyword_density, heading_analysis, internal_links, external_links, broken_links,
      content_analysis, serp_preview, google_preview
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'product', String(productId), slug || '', seoTitle, metaDescription, slug, canonicalUrl, focusKeyword, secondaryKeywords,
    breadcrumbTitle, ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription, twitterImage, twitterCard, schemaType, schemaJson,
    imageAlt, imageTitle, imageCaption, imageFilename, imageStatus, compressionStatus,
    payload.index !== undefined ? (payload.index ? 1 : 0) : 1,
    payload.noindex ? 1 : 0,
    payload.follow !== undefined ? (payload.follow ? 1 : 0) : 1,
    payload.nofollow ? 1 : 0,
    priority, changeFrequency, payload.ai_generated ? 1 : 0,
    seoScore, readability, keywordDensity, headingAnalysis,
    internalLinks, externalLinks, brokenLinks, contentAnalysis, serpPreview, googlePreview
  );
  return db.prepare('SELECT * FROM seo_meta WHERE id = ?').get(info.lastInsertRowid);
}

// GET /api/products  (public) - list with filter/sort/search/pagination
router.get('/', (req, res) => {
  const { category, sort, q, min, max, limit, offset, featured } = req.query;
  let sql = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];

  if (category && category !== 'All') { sql += ' AND category = ?'; params.push(category); }
  if (q) { sql += ' AND name LIKE ?'; params.push(`%${q}%`); }
  if (min) { sql += ' AND price >= ?'; params.push(Number(min)); }
  if (max) { sql += ' AND price <= ?'; params.push(Number(max)); }
  if (featured === 'new') sql += ' AND is_new = 1';
  if (featured === 'bestseller') sql += ' AND is_bestseller = 1';

  const sortMap = {
    price_asc: 'price ASC', price_desc: 'price DESC',
    newest: 'id DESC', rating: 'rating DESC', name: 'name ASC',
  };
  sql += ` ORDER BY ${sortMap[sort] || 'id ASC'}`;

  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
  if (offset) { sql += ' OFFSET ?'; params.push(Number(offset)); }

  const rows = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').get().c;
  res.json({ products: rows.map(withGallery), total });
});

// GET /api/products/categories (public)
router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category').all();
  res.json(rows.map(r => r.category));
});

// GET /api/products/id/:id (public) - single product by numeric id
router.get('/id/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid product id.' });
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: withGallery(product) });
});

// GET /api/products/:slug (public) - single product + related
router.get('/:slug', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  const related = db.prepare('SELECT * FROM products WHERE category = ? AND id != ? AND is_active = 1 LIMIT 4')
    .all(product.category, product.id);
  res.json({ product: withGallery(product), related: related.map(withGallery) });
});

// ---- Admin (protected) ----

// POST /api/products (admin)
router.post('/', requireAdmin, (req, res) => {
  const b = req.body || {};
  const name = sanitizeText(b.name || '').slice(0, 160);
  const category = sanitizeText(b.category || '').slice(0, 80);
  const price = Number(b.price);
  if (!name || !Number.isFinite(price) || !category) {
    return res.status(400).json({ error: 'name, category and price are required.' });
  }
  const slug = slugify(name);
  try {
    const info = db.prepare(`
      INSERT INTO products (sku, slug, name, category, price, old_price, movement, case_mm, strap, water_resist, description, image, gallery_json, stock, rating, is_new, is_bestseller)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nextSku(), slug, escapeHtml(name), escapeHtml(category), price, Number.isFinite(Number(b.old_price)) ? Number(b.old_price) : null,
      escapeHtml(sanitizeText(b.movement || '').slice(0, 80)), Number.isFinite(Number(b.case_mm)) ? Number(b.case_mm) : null, escapeHtml(sanitizeText(b.strap || '').slice(0, 80)), escapeHtml(sanitizeText(b.water_resist || '').slice(0, 80)),
      escapeHtml(sanitizeText(b.description || '').slice(0, 2000)), sanitizeUrl(b.image || '/images/products/meridian-steel.svg', { allowRelative: true }), galleryValue(Array.isArray(b.gallery) ? b.gallery : []),
      Number.isFinite(Number(b.stock)) ? Number(b.stock) : 0, Number.isFinite(Number(b.rating)) ? Number(b.rating) : 4.5, b.is_new ? 1 : 0, b.is_bestseller ? 1 : 0
    );
    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    upsertProductSeo(created.id, { ...b.seo, slug: sanitizeText(b.seo?.slug || slug).slice(0, 160) });
    res.status(201).json(withGallery(created));
  } catch (err) {
    res.status(400).json({ error: 'Could not create product. ' + err.message });
  }
});

// PUT /api/products/:id (admin)
router.put('/:id', requireAdmin, (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });
  const name = sanitizeText(b.name ?? existing.name).slice(0, 160);
  const category = sanitizeText(b.category ?? existing.category).slice(0, 80);
  const price = Number.isFinite(Number(b.price ?? existing.price)) ? Number(b.price ?? existing.price) : existing.price;
  const slug = b.name ? slugify(name) : existing.slug;
  db.prepare(`
    UPDATE products SET name=?, slug=?, category=?, price=?, old_price=?, movement=?, case_mm=?, strap=?,
    water_resist=?, description=?, image=?, gallery_json=?, stock=?, rating=?, is_new=?, is_bestseller=?, is_active=? WHERE id=?
  `).run(
    escapeHtml(name), slug, escapeHtml(category), price,
    Number.isFinite(Number(b.old_price ?? existing.old_price)) ? Number(b.old_price ?? existing.old_price) : existing.old_price, escapeHtml(sanitizeText(b.movement ?? existing.movement).slice(0, 80)), Number.isFinite(Number(b.case_mm ?? existing.case_mm)) ? Number(b.case_mm ?? existing.case_mm) : existing.case_mm,
    escapeHtml(sanitizeText(b.strap ?? existing.strap).slice(0, 80)), escapeHtml(sanitizeText(b.water_resist ?? existing.water_resist).slice(0, 80)), escapeHtml(sanitizeText(b.description ?? existing.description).slice(0, 2000)),
    sanitizeUrl(b.image ?? existing.image, { allowRelative: true }) || existing.image, galleryValue(Array.isArray(b.gallery) ? b.gallery : (existing.gallery_json ? JSON.parse(existing.gallery_json || '[]') : []), existing.gallery_json || '[]'), Number.isFinite(Number(b.stock ?? existing.stock)) ? Number(b.stock ?? existing.stock) : existing.stock,
    Number.isFinite(Number(b.rating ?? existing.rating)) ? Number(b.rating ?? existing.rating) : existing.rating,
    b.is_new !== undefined ? (b.is_new ? 1 : 0) : existing.is_new,
    b.is_bestseller !== undefined ? (b.is_bestseller ? 1 : 0) : existing.is_bestseller,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active,
    req.params.id
  );
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  upsertProductSeo(product.id, { ...b.seo, slug: sanitizeText(b.seo?.slug || product.slug).slice(0, 160) });
  res.json(withGallery(product));
});

// DELETE /api/products/:id (admin)
router.delete('/:id', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Product not found.' });
  res.json({ success: true });
});

module.exports = router;
