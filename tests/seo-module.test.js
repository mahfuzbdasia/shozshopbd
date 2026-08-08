const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../server/db/database');

test('seo tables are created and support inserts', () => {
  const before = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='seo_meta'").get();
  assert.ok(before);

  const info = db.prepare('INSERT INTO seo_meta (entity_type, entity_id, entity_slug, seo_title, meta_description) VALUES (?, ?, ?, ?, ?)').run('product', '1', 'demo-watch', 'Demo watch title', 'Demo watch description');
  assert.ok(info.lastInsertRowid > 0);

  const row = db.prepare('SELECT seo_title, meta_description FROM seo_meta WHERE id = ?').get(info.lastInsertRowid);
  assert.equal(row.seo_title, 'Demo watch title');
  assert.equal(row.meta_description, 'Demo watch description');
});

test('seo metadata supports the expanded product fields', () => {
  const info = db.prepare(`
    INSERT INTO seo_meta (
      entity_type, entity_id, entity_slug, seo_title, meta_description, breadcrumb_title, og_title, og_image,
      twitter_title, twitter_description, twitter_image, schema_json, image_alt, image_title, image_caption,
      image_filename, image_status, compression_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'product', '999', 'expanded-watch', 'Expanded watch title', 'Expanded watch description',
    'Expanded breadcrumb', 'Expanded OG title', '/images/og.jpg', 'Expanded Twitter title',
    'Expanded Twitter description', '/images/twitter.jpg', '{"@type":"Product"}', 'Expanded image alt',
    'Expanded image title', 'Expanded caption', 'expanded-watch.jpg', 'Ready', 'Optimized'
  );

  const row = db.prepare('SELECT breadcrumb_title, og_title, og_image, twitter_title, twitter_description, twitter_image, schema_json, image_alt, image_title, image_caption, image_filename, image_status, compression_status FROM seo_meta WHERE id = ?').get(info.lastInsertRowid);
  assert.equal(row.breadcrumb_title, 'Expanded breadcrumb');
  assert.equal(row.og_title, 'Expanded OG title');
  assert.equal(row.og_image, '/images/og.jpg');
  assert.equal(row.twitter_title, 'Expanded Twitter title');
  assert.equal(row.schema_json, '{"@type":"Product"}');
  assert.equal(row.image_status, 'Ready');
  assert.equal(row.compression_status, 'Optimized');
});
