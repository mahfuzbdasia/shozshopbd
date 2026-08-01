// SohozShopBD — shop listing page
(function () {
  const grid = document.getElementById('product-grid');
  const chipRow = document.getElementById('filter-chips');
  const sortSelect = document.getElementById('sort-select');
  const searchInput = document.getElementById('shop-search');
  const resultCount = document.getElementById('result-count');
  const emptyState = document.getElementById('empty-state');

  let state = {
    category: qs('category') || 'All',
    sort: qs('sort') || 'newest',
    q: qs('q') || '',
    featured: qs('filter') || '',
  };

  function cardHTML(p, badgeSettings) {
    const oldPrice = p.old_price ? `<span class="old">${formatBDT(p.old_price)}</span>` : '';
    const safeName = escapeHtml(p.name);
    const safeCategory = escapeHtml(p.category);
    const safeSlug = escapeHtml(p.slug);
    const safeImage = escapeHtml(p.image);
    const safeSku = escapeHtml(p.sku);
    return `
      <article class="product-card">
        <a href="/product.html?slug=${safeSlug}" class="product-thumb" aria-label="View ${safeName}">
          ${ProductBadges.markup(p, badgeSettings)}
          <img src="${safeImage}" alt="${safeName} — ${safeCategory} watch, ${p.case_mm}mm case" loading="lazy" width="300" height="300">
          <button class="quick-add" data-add="${p.id}">Add to cart</button>
        </a>
        <div class="product-cat">${safeCategory} · ${p.case_mm}mm</div>
        <h3 class="product-name"><a href="/product.html?slug=${safeSlug}">${safeName}</a></h3>
        <div class="sku-tag">REF. ${safeSku}</div>
        <div class="product-meta">
          <span class="price">${oldPrice}${formatBDT(p.price)}</span>
          <span class="rating"><span class="star">★</span>${p.rating}</span>
        </div>
      </article>`;
  }

  async function load() {
    grid.innerHTML = Array.from({ length: 8 }).map(() => `<div class="product-card"><div class="product-thumb skeleton"></div><div class="skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div><div class="skeleton" style="height:14px;width:40%;"></div></div>`).join('');

    const params = new URLSearchParams();
    if (state.category && state.category !== 'All') params.set('category', state.category);
    if (state.sort) params.set('sort', state.sort);
    if (state.q) params.set('q', state.q);
    if (state.featured) params.set('featured', state.featured);

    try {
      const [res, badgeSettings] = await Promise.all([
        fetch(`/api/products?${params.toString()}`),
        ProductBadges.ready(),
      ]);
      const data = await res.json();
      renderProducts(data.products, badgeSettings);
    } catch (err) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
    }
  }

  function renderProducts(products, badgeSettings) {
    if (!products.length) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      resultCount.textContent = '0 watches';
      return;
    }
    emptyState.classList.add('hidden');
    grid.innerHTML = products.map((product) => cardHTML(product, badgeSettings)).join('');
    resultCount.textContent = `${products.length} watch${products.length === 1 ? '' : 'es'}`;
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/products/categories');
      const cats = await res.json();
      const all = ['All', ...cats];
      chipRow.innerHTML = all.map((c) => `<button class="filter-chip${c === state.category ? ' active' : ''}" data-cat="${c}">${c}</button>`).join('');
    } catch (err) { /* categories are a progressive enhancement */ }
  }

  chipRow.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.category = btn.dataset.cat;
    chipRow.querySelectorAll('.filter-chip').forEach((c) => c.classList.toggle('active', c === btn));
    load();
  });

  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; load(); });

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = searchInput.value.trim(); load(); }, 300);
  });

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();
    const id = Number(btn.dataset.add);
    const res = await fetch('/api/products');
    const data = await res.json();
    const product = data.products.find((p) => p.id === id);
    if (product) {
      Cart.add(product, 1);
      btn.textContent = 'Added ✓';
      setTimeout(() => (btn.textContent = 'Add to cart'), 1400);
    }
  });

  if (searchInput && state.q) searchInput.value = state.q;
  if (sortSelect) sortSelect.value = state.sort;
  loadCategories().then(load);
})();
