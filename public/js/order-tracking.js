// SohozShopBD — /order-tracking.html
(function () {
  const form = document.getElementById('track-form');
  const result = document.getElementById('track-result');
  if (!form) return;

  const statusSteps = ['Pending', 'Processing', 'Shipped', 'Delivered'];

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderNo = document.getElementById('order-no-input').value.trim();
    result.innerHTML = '<p class="form-note">Looking up your order...</p>';
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(orderNo)}`);
      const data = await res.json();
      if (!res.ok) {
        result.innerHTML = `<div class="alert alert-error show">${data.error}</div>`;
        return;
      }
      const stepIndex = statusSteps.indexOf(data.status);
      const isCancelled = data.status === 'Cancelled';
      result.innerHTML = `
        <div class="track-card">
          <div class="track-head">
            <div><span class="eyebrow">Order ${data.order_no}</span><h3>${isCancelled ? 'Cancelled' : data.status}</h3></div>
            <div class="price">${formatBDT(data.total)}</div>
          </div>
          ${!isCancelled ? `
          <div class="track-steps">
            ${statusSteps.map((s, i) => `<div class="track-step ${i <= stepIndex ? 'done' : ''}"><span class="dot"></span>${s}</div>`).join('')}
          </div>` : `<p class="form-note">This order was cancelled. Contact us if that's unexpected.</p>`}
          <div class="track-items">
            ${data.items_json.map((i) => `<div class="co-line"><span>${i.name} ×${i.qty}</span><span>${formatBDT(i.price * i.qty)}</span></div>`).join('')}
          </div>
        </div>`;
    } catch (err) {
      result.innerHTML = '<div class="alert alert-error show">Could not reach the server. Please try again.</div>';
    }
  });
})();
