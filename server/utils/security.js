function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeText(value, maxLength = 200) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

function sanitizeUrl(value, { allowRelative = true } = {}) {
  if (value === null || value === undefined) return '';
  const candidate = String(value).trim();
  if (!candidate) return '';
  if (candidate.startsWith('//')) return '';
  if (/^(javascript|data|vbscript):/i.test(candidate)) return '';
  if (candidate.startsWith('mailto:')) return '';
  if (allowRelative && /^(\/|\.\.?\/|[A-Za-z0-9._-]+(?:\/|#|\?))/.test(candidate)) return candidate;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return '';
}

module.exports = { escapeHtml, sanitizeText, sanitizeUrl };
