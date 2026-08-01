// SohozShopBD — shared formatting helpers
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function formatBDT(amount) {
  return '৳' + Number(amount).toLocaleString('en-US');
}
function starRow(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}
