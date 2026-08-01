// SohozShopBD — single product detail page
(function () {
  const root = document.getElementById('product-root');
  const relatedGrid = document.getElementById('related-grid');
  const slug = qs('slug');

  function relatedCard(p, badgeSettings) {
    const safeName = escapeHtml(p.name);
    const safeCategory = escapeHtml(p.category);
    const safeSlug = escapeHtml(p.slug);
    const safeImage = escapeHtml(p.image);
    return `
      <article class="product-card">
        <a href="/product.html?slug=${safeSlug}" class="product-thumb">
          ${ProductBadges.markup(p, badgeSettings)}
          <img src="${safeImage}" alt="${safeName}" loading="lazy" width="300" height="300">
        </a>
        <div class="product-cat">${safeCategory}</div>
        <h3 class="product-name"><a href="/product.html?slug=${safeSlug}">${safeName}</a></h3>
        <div class="product-meta">
          <span class="price">${formatBDT(p.price)}</span>
          <span class="rating"><span class="star">★</span>${p.rating}</span>
        </div>
      </article>`;
  }

  async function load() {
    if (!slug) { root.innerHTML = notFoundHTML(); return; }
    try {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) { root.innerHTML = notFoundHTML(); return; }
      const { product, related } = await res.json();
      const badgeSettings = await ProductBadges.ready();
      render(product, badgeSettings);
      document.title = `${product.name} — SOHOZ SHOP BD Watches`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', `${product.name}: ${product.description} ${formatBDT(product.price)}.`);
      injectSchema(product);
      relatedGrid.innerHTML = related.map((item) => relatedCard(item, badgeSettings)).join('');
    } catch (err) {
      root.innerHTML = notFoundHTML();
    }
  }

  function notFoundHTML() {
    return `<div class="empty-state"><h3>Watch not found</h3><p>That reference may have been retired. Browse the current collection instead.</p><a href="/shop.html" class="btn btn-primary">Back to shop</a></div>`;
  }

  function setupGallery(p) {
    const gallery = [p.image, ...(Array.isArray(p.gallery) ? p.gallery : [])]
      .filter((image, index, images) => image && images.indexOf(image) === index)
      .slice(0, 6)
      .map((src) => ({ src, alt: `${p.name} — ${p.category} watch` }));
    const mainImage = document.getElementById('product-main-image');
    const thumbButtons = [...document.querySelectorAll('[data-gallery-index]')];
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    let activeIndex = 0;
    let touchStartX = 0;

    function show(index) {
      activeIndex = (index + gallery.length) % gallery.length;
      mainImage.classList.add('is-changing');
      window.setTimeout(() => {
        mainImage.src = gallery[activeIndex].src;
        mainImage.alt = gallery[activeIndex].alt;
        mainImage.classList.remove('is-changing');
      }, 120);
      thumbButtons.forEach((button, buttonIndex) => {
        const selected = buttonIndex === activeIndex;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-current', selected ? 'true' : 'false');
      });
    }
    function openLightbox() {
      lightbox.classList.remove('hidden');
      lightboxImage.src = gallery[activeIndex].src;
      lightboxImage.alt = gallery[activeIndex].alt;
      document.body.classList.add('gallery-open');
    }
    function closeLightbox() {
      lightbox.classList.add('hidden');
      document.body.classList.remove('gallery-open');
    }
    function moveLightbox(step) {
      show(activeIndex + step);
      lightboxImage.src = gallery[activeIndex].src;
      lightboxImage.alt = gallery[activeIndex].alt;
    }

    thumbButtons.forEach((button) => button.addEventListener('click', () => show(Number(button.dataset.galleryIndex))));
    mainImage.addEventListener('click', openLightbox);
    document.querySelector('.gallery-expand').addEventListener('click', openLightbox);
    mainImage.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
    mainImage.addEventListener('touchend', (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) > 45) moveLightbox(distance < 0 ? 1 : -1);
    }, { passive: true });
    lightboxImage.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
    lightboxImage.addEventListener('touchend', (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) > 45) moveLightbox(distance < 0 ? 1 : -1);
    }, { passive: true });
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox-prev').addEventListener('click', () => moveLightbox(-1));
    document.getElementById('lightbox-next').addEventListener('click', () => moveLightbox(1));
    lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (event) => {
      if (lightbox.classList.contains('hidden')) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') moveLightbox(-1);
      if (event.key === 'ArrowRight') moveLightbox(1);
    });
    show(0);
  }

  function render(p, badgeSettings) {
    const stockLabel = p.stock > 5 ? `<span style="color:var(--pine)">In stock</span>` : p.stock > 0 ? `<span style="color:var(--brass-dark)">Only ${p.stock} left</span>` : `<span style="color:var(--danger)">Out of stock</span>`;
    const gallery = [p.image, ...(Array.isArray(p.gallery) ? p.gallery : [])]
      .filter((image, index, images) => image && images.indexOf(image) === index)
      .slice(0, 6);
    const safeName = escapeHtml(p.name);
    const safeCategory = escapeHtml(p.category);
    const safeSku = escapeHtml(p.sku);
    const safeDescription = escapeHtml(p.description);
    const safeMovement = escapeHtml(p.movement);
    const safeStrap = escapeHtml(p.strap);
    const safeWater = escapeHtml(p.water_resist);
    const safeImage = escapeHtml(gallery[0]);
    root.innerHTML = `
      <div class="pd-grid">
        <div class="pd-gallery">
          <div class="pd-image">
          ${ProductBadges.markup(p, badgeSettings)}
            <img id="product-main-image" src="${safeImage}" alt="${safeName} — ${safeCategory} watch, ${p.case_mm}mm ${safeStrap} strap" width="520" height="520" fetchpriority="high">
            <button class="gallery-expand" type="button" aria-label="Open image gallery">+</button>
          </div>
          <div class="gallery-thumbs" role="list" aria-label="Product images">
            ${gallery.map((image, index) => `<button type="button" class="gallery-thumb${index === 0 ? ' active' : ''}" data-gallery-index="${index}" aria-label="View image ${index + 1}" aria-current="${index === 0 ? 'true' : 'false'}"><img src="${image}" alt="" loading="${index === 0 ? 'eager' : 'lazy'}" width="88" height="88"></button>`).join('')}
          </div>
        </div>
        <div class="pd-info">
          <div class="product-cat">${safeCategory}</div>
          <h1>${safeName}</h1>
          <div class="sku-tag" style="margin:6px 0 18px;">REF. ${safeSku} &nbsp;·&nbsp; <span class="rating"><span class="star">★</span>${p.rating} (${p.reviews} reviews)</span></div>
          <div class="pd-price">
            ${p.old_price ? `<span class="old">${formatBDT(p.old_price)}</span>` : ''}
            <span class="price-main">${formatBDT(p.price)}</span>
          </div>
          <p class="pd-desc">${safeDescription}</p>
          <p class="pd-stock">${stockLabel}</p>

          <div class="pd-qty-row">
            <div class="qty-stepper">
              <button type="button" id="qty-minus" aria-label="Decrease quantity">−</button>
              <input type="number" id="qty-input" value="1" min="1" max="${Math.max(1, p.stock)}" aria-label="Quantity">
              <button type="button" id="qty-plus" aria-label="Increase quantity">+</button>
            </div>
            <div class="pd-action-buttons">
              <button class="btn btn-primary" id="add-to-cart" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Out of stock' : 'Add to cart'}</button>
              <button class="btn btn-buy-now" id="buy-now" aria-label="Buy Now" ${p.stock === 0 ? 'disabled' : ''}>Buy Now</button>
            </div>
          </div>

          <dl class="spec-list">
            <div><dt>Movement</dt><dd>${safeMovement}</dd></div>
            <div><dt>Case diameter</dt><dd>${p.case_mm}mm</dd></div>
            <div><dt>Strap</dt><dd>${safeStrap}</dd></div>
            <div><dt>Water resistance</dt><dd>${safeWater}</dd></div>
          </dl>

          <div class="pd-trust">
            <div>🚚 Free shipping on orders over ${formatBDT(10000)}</div>
            <div>↺ 14-day returns</div>
            <div>🛡 2-year international warranty</div>
          </div>
        </div>
      </div>
      <div class="gallery-lightbox hidden" id="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Product image gallery">
        <button class="lightbox-close" type="button" id="lightbox-close" aria-label="Close image gallery">×</button>
        <button class="lightbox-control lightbox-prev" type="button" id="lightbox-prev" aria-label="Previous image">‹</button>
        <img id="lightbox-image" src="${safeImage}" alt="${safeName}" loading="lazy">
        <button class="lightbox-control lightbox-next" type="button" id="lightbox-next" aria-label="Next image">›</button>
      </div>
    `;

    setupGallery(p);

    const qtyInput = document.getElementById('qty-input');
    document.getElementById('qty-minus').addEventListener('click', () => {
      qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      qtyInput.value = Math.min(Number(qtyInput.max) || 99, Number(qtyInput.value) + 1);
    });
    const addBtn = document.getElementById('add-to-cart');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        Cart.add(p, Number(qtyInput.value));
        addBtn.textContent = 'Added to cart ✓';
        setTimeout(() => (addBtn.textContent = 'Add to cart'), 1600);
      });
    }
    const buyBtn = document.getElementById('buy-now');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        Cart.add(p, Number(qtyInput.value));
        window.location.href = '/checkout.html';
      });
    }
  }

  function injectSchema(p) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: p.name,
      image: p.image,
      description: p.description,
      sku: p.sku,
      brand: { '@type': 'Brand', name: 'SOHOZ SHOP BD' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'BDT',
        price: p.price,
        availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: window.location.href,
      },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews },
    });
    document.head.appendChild(script);
  }

  load();
})();
