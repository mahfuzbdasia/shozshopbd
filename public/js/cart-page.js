// SohozShopBD — /cart.html page logic
(function () {
  const list = document.getElementById('cart-list');
  const emptyState = document.getElementById('cart-empty');
  const summary = document.getElementById('cart-summary');
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');

  function row(item) {
    return `
      <div class="cart-row" data-id="${item.id}">
        <img src="${item.image}" alt="${item.name}" width="72" height="72">
        <div class="cart-row-info">
          <h4>${item.name}</h4>
          <div class="sku-tag">REF. ${item.sku}</div>
          <button class="btn-ghost cart-remove" data-remove="${item.id}">Remove</button>
        </div>
        <div class="qty-stepper">
          <button type="button" data-dec="${item.id}" aria-label="Decrease quantity">−</button>
          <input type="number" value="${item.qty}" min="1" data-qty="${item.id}" aria-label="Quantity">
          <button type="button" data-inc="${item.id}" aria-label="Increase quantity">+</button>
        </div>
        <div class="price">${formatBDT(item.price * item.qty)}</div>
      </div>`;
  }

  function render() {
    const items = Cart.read();
    if (!items.length) {
      list.innerHTML = '';
      emptyState.classList.remove('hidden');
      summary.classList.add('hidden');
      return;
    }
    emptyState.classList.add('hidden');
    summary.classList.remove('hidden');
    list.innerHTML = items.map(row).join('');
    const subtotal = Cart.subtotal();
    const shipping = subtotal >= 10000 ? 0 : 120;
    subtotalEl.textContent = formatBDT(subtotal);
    shippingEl.textContent = shipping === 0 ? 'Free' : formatBDT(shipping);
    document.getElementById('cart-total').textContent = formatBDT(subtotal + shipping);
  }

  list.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const rem = e.target.closest('[data-remove]');
    if (inc) {
      const id = Number(inc.dataset.inc);
      const item = Cart.read().find((i) => i.id === id);
      Cart.updateQty(id, item.qty + 1);
      render();
    } else if (dec) {
      const id = Number(dec.dataset.dec);
      const item = Cart.read().find((i) => i.id === id);
      Cart.updateQty(id, item.qty - 1);
      render();
    } else if (rem) {
      Cart.remove(Number(rem.dataset.remove));
      render();
    }
  });

  list.addEventListener('change', (e) => {
    const input = e.target.closest('[data-qty]');
    if (!input) return;
    Cart.updateQty(Number(input.dataset.qty), Math.max(1, Number(input.value)));
    render();
  });

  render();
})();
