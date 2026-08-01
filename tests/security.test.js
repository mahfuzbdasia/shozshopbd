const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, sanitizeUrl } = require('../server/utils/security');

test('escapeHtml neutralizes embedded HTML markup', () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
});

test('sanitizeUrl rejects dangerous schemes while allowing safe URLs', () => {
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('/shop.html'), '/shop.html');
  assert.equal(sanitizeUrl('https://example.com/image.png'), 'https://example.com/image.png');
});
