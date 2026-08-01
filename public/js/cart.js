// SohozShopBD — cart stored in localStorage, shared across pages.
const Cart = (function () {
  const KEY = 'SohozShopBD_cart';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    updateBadge();
  }
  function add(product, qty) {
    qty = qty || 1;
    const items = read();
    const existing = items.find((i) => i.id === product.id);
    if (existing) existing.qty += qty;
    else items.push({ id: product.id, name: product.name, price: product.price, image: product.image, sku: product.sku, qty });
    write(items);
  }
  function updateQty(id, qty) {
    let items = read();
    if (qty <= 0) items = items.filter((i) => i.id !== id);
    else items = items.map((i) => (i.id === id ? { ...i, qty } : i));
    write(items);
  }
  function remove(id) {
    write(read().filter((i) => i.id !== id));
  }
  function clear() { write([]); }
  function count() { return read().reduce((sum, i) => sum + i.qty, 0); }
  function subtotal() { return read().reduce((sum, i) => sum + i.qty * i.price, 0); }
  function updateBadge() {
    document.querySelectorAll('[data-cart-count]').forEach((el) => (el.textContent = count()));
  }

  document.addEventListener('DOMContentLoaded', updateBadge);
  return { read, add, updateQty, remove, clear, count, subtotal, updateBadge };
})();
