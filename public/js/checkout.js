// SohozShopBD — /checkout.html page logic
(function () {
  const form = document.getElementById('checkout-form');
  const summaryList = document.getElementById('checkout-items');
  const subtotalEl = document.getElementById('co-subtotal');
  const deliveryChargeEl = document.getElementById('co-delivery-charge');
  const discountRow = document.getElementById('co-discount-row');
  const discountEl = document.getElementById('co-discount');
  const totalEl = document.getElementById('co-total');
  const couponInput = document.getElementById('coupon-code');
  const couponBtn = document.getElementById('apply-coupon');
  const couponMsg = document.getElementById('coupon-msg');
  const successPanel = document.getElementById('checkout-success');
  const alertBox = document.getElementById('checkout-alert');
  const successSubtotalEl = document.getElementById('success-subtotal');
  const successDeliveryChargeEl = document.getElementById('success-delivery-charge');
  const successDiscountEl = document.getElementById('success-discount');
  const successTotalEl = document.getElementById('success-total');
  const cityPicker = document.querySelector('[data-city-picker]');
  const cityInput = document.getElementById('co-city');
  const citySearchInput = document.getElementById('city-search-input');
  const cityDropdown = document.getElementById('city-dropdown');
  const cityOptions = document.getElementById('city-options');
  const cityToggle = cityPicker?.querySelector('.city-picker-toggle');
  const addressInput = document.getElementById('co-address');
  const submitButton = form.querySelector('button[type="submit"]');

  let appliedDiscount = 0;
  let appliedCode = null;
  let checkoutSettings = null;
  let verifiedLocation = null;
  let geocodeTimer;
  let cityActiveIndex = -1;
  const geocodeCache = new Map();
  const VALID_DISTRICTS = [
    'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail',
    'Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', 'Cumilla', 'Cox\'s Bazar', 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati',
    'Bogura', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 'Natore', 'Pabna', 'Rajshahi', 'Sirajganj',
    'Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira',
    'Barguna', 'Barishal', 'Bhola', 'Jhalokathi', 'Patuakhali', 'Pirojpur',
    'Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet',
    'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon',
    'Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur',
  ];
  const cityGroups = [
    { division: 'Dhaka Division', cities: ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Narsingdi'] },
    { division: 'Chattogram Division', cities: ['Chattogram', 'Cumilla', 'Cox\'s Bazar', 'Noakhali', 'Feni', 'Brahmanbaria'] },
    { division: 'Rajshahi Division', cities: ['Rajshahi', 'Bogura', 'Pabna', 'Sirajganj', 'Joypurhat'] },
    { division: 'Khulna Division', cities: ['Khulna', 'Jashore', 'Satkhira', 'Bagerhat', 'Chuadanga'] },
    { division: 'Barishal Division', cities: ['Barishal', 'Patuakhali', 'Bhola', 'Pirojpur'] },
    { division: 'Rangpur Division', cities: ['Rangpur', 'Dinajpur', 'Kurigram', 'Nilphamari', 'Gaibandha', 'Thakurgaon'] },
    { division: 'Sylhet Division', cities: ['Sylhet', 'Moulvibazar', 'Sunamganj', 'Habiganj'] },
    { division: 'Mymensingh Division', cities: ['Mymensingh', 'Jamalpur', 'Sherpur', 'Netrokona'] },
  ];

  function setLocationValidity(valid, options = {}) {
    const allowBypass = options.allowBypass !== false;
    if (!valid && !allowBypass) {
      verifiedLocation = null;
    }
    if (checkoutSettings?.enableVerification === false) {
      submitButton.disabled = false;
      return;
    }
    submitButton.disabled = !allowBypass && !valid;
  }

  function calculateDeliveryCharge(district) {
    const selected = String(district || '').trim();
    if (!selected) return null;
    return selected === 'Dhaka' ? 80 : VALID_DISTRICTS.includes(selected) ? 150 : null;
  }

  function isValidDistrict(value) {
    return VALID_DISTRICTS.includes(String(value || '').trim());
  }

  async function fetchProductById(id) {
    try {
      const res = await fetch(`/api/products/id/${encodeURIComponent(String(id))}`);
      if (!res.ok) return null;
      const payload = await readJsonResponse(res, 'Could not load product details.');
      return payload?.product || null;
    } catch (err) {
      console.warn('Product fetch failed:', err);
      return null;
    }
  }

  function restoreSavedDistrict() {
    const saved = localStorage.getItem('sohoz_checkout_city');
    if (saved && isValidDistrict(saved)) {
      cityInput.value = saved;
    }
  }

  function getItemAttributes(item) {
    const attributes = [];
    if (Array.isArray(item.attributes)) {
      item.attributes.forEach((attr) => {
        if (attr && typeof attr === 'string') attributes.push(attr);
      });
    } else if (item.attributes && typeof item.attributes === 'object') {
      Object.entries(item.attributes).forEach(([key, value]) => {
        if (value) attributes.push(`${escapeHtml(key)}: ${escapeHtml(String(value))}`);
      });
    }
    return attributes;
  }

  function getStockNote(item) {
    if (item.stock === undefined || item.stock === null) return '';
    if (item.stock <= 0) return 'Out of stock';
    if (item.qty >= item.stock) return `Only ${item.stock} available`;
    return '';
  }

  function renderEmptyState() {
    summaryList.innerHTML = `
      <div class="checkout-empty-state">
        <p>Your cart is empty.</p>
        <a href="/shop.html" class="btn btn-primary">Continue shopping</a>
      </div>
    `;
    couponMsg.textContent = '';
    discountRow.classList.add('hidden');
    submitButton.disabled = true;
  }

  async function recalculateCoupon() {
    if (!appliedCode) return;
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: appliedCode, subtotal: Cart.subtotal() }),
      });
      const data = await readJsonResponse(res, 'Could not validate coupon right now.');
      if (data.valid) {
        appliedDiscount = data.discount;
        appliedCode = data.code;
        couponMsg.textContent = `Code ${data.code} applied — you saved ${formatBDT(data.discount)}.`;
        couponMsg.style.color = 'var(--pine)';
      } else {
        appliedDiscount = 0;
        appliedCode = null;
        couponMsg.textContent = data.error || 'Coupon is no longer valid.';
        couponMsg.style.color = 'var(--danger)';
      }
    } catch (err) {
      appliedDiscount = 0;
      appliedCode = null;
      couponMsg.textContent = 'Coupon could not be refreshed.';
      couponMsg.style.color = 'var(--danger)';
    }
  }

  async function adjustCartQuantity(item, targetQty) {
    if (targetQty < 1) return;
    let stock = item.stock;
    if (stock === undefined || stock === null) {
      const product = await fetchProductById(item.id);
      if (product) stock = product.stock;
    }
    if (stock !== undefined && stock !== null && targetQty > stock) {
      alertBox.textContent = `Only ${stock} available for ${item.name}.`;
      alertBox.className = 'alert alert-error show';
      return;
    }
    Cart.updateQty(item.id, targetQty);
    await recalculateCoupon();
    renderSummary();
  }

  async function handleRemoveItem(itemId) {
    if (!window.confirm('Remove this product from your order?')) return;
    Cart.remove(itemId);
    await recalculateCoupon();
    renderSummary();
  }

  function getDeliveryChargeLabel(district) {
    const charge = calculateDeliveryCharge(district);
    return charge === null ? '—' : formatBDT(charge);
  }

  function renderCityOptions(query = '') {
    if (!cityOptions) return;
    const normalized = String(query || '').trim().toLowerCase();
    const filteredGroups = cityGroups
      .map((group) => ({ ...group, cities: group.cities.filter((city) => city.toLowerCase().includes(normalized)) }))
      .filter((group) => group.cities.length);

    cityOptions.innerHTML = '';
    if (!filteredGroups.length) {
      cityOptions.innerHTML = '<div class="city-picker-empty">No cities found.</div>';
      cityActiveIndex = -1;
      return;
    }

    filteredGroups.forEach((group) => {
      const section = document.createElement('div');
      section.className = 'city-picker-group';
      const title = document.createElement('div');
      title.className = 'city-picker-group-title';
      title.textContent = group.division;
      section.appendChild(title);
      group.cities.forEach((city) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'city-picker-option';
        button.textContent = city;
        if (cityInput.value.trim().toLowerCase() === city.toLowerCase()) {
          button.classList.add('is-selected');
        }
        button.addEventListener('click', () => {
          cityInput.value = city;
          if (citySearchInput) citySearchInput.value = city;
          closeCityDropdown();
          scheduleGeocode();
        });
        section.appendChild(button);
      });
      cityOptions.appendChild(section);
    });

    cityActiveIndex = -1;
  }

  function openCityDropdown() {
    if (!cityPicker) return;
    cityPicker.classList.add('is-open');
    cityInput.setAttribute('aria-expanded', 'true');
    renderCityOptions(citySearchInput?.value || cityInput.value);
    if (citySearchInput) {
      citySearchInput.value = cityInput.value;
      setTimeout(() => citySearchInput.focus(), 0);
    }
  }

  function closeCityDropdown() {
    if (!cityPicker) return;
    cityPicker.classList.remove('is-open');
    cityInput.setAttribute('aria-expanded', 'false');
  }

  function moveCitySelection(direction) {
    const options = Array.from(cityOptions?.querySelectorAll('.city-picker-option') || []);
    if (!options.length) return;
    if (cityActiveIndex < 0) {
      cityActiveIndex = direction > 0 ? -1 : options.length;
    }
    cityActiveIndex = (cityActiveIndex + direction + options.length) % options.length;
    options.forEach((option, index) => option.classList.toggle('is-active', index === cityActiveIndex));
    options[cityActiveIndex].scrollIntoView({ block: 'nearest' });
  }

  function handleCityKeydown(event) {
    if (!cityPicker) return;
    const options = Array.from(cityOptions?.querySelectorAll('.city-picker-option') || []);
    if (!cityPicker.classList.contains('is-open')) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openCityDropdown();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveCitySelection(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveCitySelection(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (cityActiveIndex >= 0 && options[cityActiveIndex]) {
        options[cityActiveIndex].click();
      } else if (options[0]) {
        options[0].click();
      }
    } else if (event.key === 'Escape') {
      closeCityDropdown();
    }
  }

  async function readJsonResponse(response, fallbackMessage) {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (!text) return null;
    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        return JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse JSON response:', err, text);
        throw new Error(fallbackMessage || 'The server returned an invalid response.');
      }
    }
    console.error('Non-JSON response received:', response.url, text);
    throw new Error(fallbackMessage || 'The server returned an unexpected response.');
  }

  function populateAddressFields(result) {
    const components = Array.isArray(result.address_components) ? result.address_components : [];
    const getComponent = (types) => components.find((component) => types.some((type) => component.types.includes(type)))?.long_name || '';
    const fullAddress = result.formatted_address || '';
    const city = getComponent(['administrative_area_level_2', 'locality', 'postal_town']) || getComponent(['administrative_area_level_1']) || '';
    const division = getComponent(['administrative_area_level_1']) || '';
    const country = getComponent(['country']) || '';
    const postalCode = getComponent(['postal_code']) || '';

    addressInput.value = fullAddress;
    cityInput.value = city;
    verifiedLocation = {
      lat: result.geometry?.location?.lat ? result.geometry.location.lat() : null,
      lon: result.geometry?.location?.lng ? result.geometry.location.lng() : null,
      placeId: result.place_id || '',
      formattedAddress: fullAddress,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${result.geometry?.location?.lat?.() || ''},${result.geometry?.location?.lng?.() || ''}`)}&query_place_id=${encodeURIComponent(result.place_id || '')}`,
      city,
      address: fullAddress,
      postalCode,
      division,
      country,
      confidence: result.confidence || 'ROOFTOP',
      matchedAutomatically: true,
    };
  }

  function scheduleGeocode() {
    verifiedLocation = null;
    setLocationValidity(false, { allowBypass: true });
    if (checkoutSettings?.enableVerification === false) return;
    clearTimeout(geocodeTimer);
    const city = cityInput.value.trim();
    const address = addressInput.value.trim();
    if (!city || !address) return;
    geocodeTimer = setTimeout(() => geocode(city, address), 800);
  }

  async function geocode(city, address) {
    const key = `${city.toLowerCase()}|${address.toLowerCase()}`;
    if (geocodeCache.has(key)) {
      const result = geocodeCache.get(key);
      verifiedLocation = result;
      if (result.city) cityInput.value = result.city;
      if (result.address) addressInput.value = result.address;
      setLocationValidity(true, { allowBypass: true });
      return;
    }

    try {
      const response = await fetch(`/api/settings/geocode?city=${encodeURIComponent(city)}&address=${encodeURIComponent(address)}`);
      const data = await readJsonResponse(response, "We couldn't determine your delivery location. Please check your city or address.");
      if (!response.ok) throw new Error(data?.error || "We couldn't determine your delivery location. Please check your city or address.");
      geocodeCache.set(key, data);
      verifiedLocation = data;
      if (data.city) cityInput.value = data.city;
      if (data.address) addressInput.value = data.address;
      setLocationValidity(true, { allowBypass: true });
    } catch (err) {
      verifiedLocation = null;
      setLocationValidity(false, { allowBypass: true });
    }
  }

  async function loadCheckoutSettings() {
    try {
      checkoutSettings = await fetch('/api/settings/checkout').then(async (res) => {
        const payload = await readJsonResponse(res, 'Could not load checkout settings.');
        if (!res.ok) throw new Error(payload?.error || 'Could not load checkout settings.');
        return payload;
      });
      const cities = Array.isArray(checkoutSettings.cities) ? checkoutSettings.cities : [];
      if (cities.length) {
        const customCities = cities.filter((city) => typeof city === 'string' && city.trim());
        const currentGroups = cityGroups.map((group) => ({ ...group, cities: group.cities.filter((city) => customCities.includes(city)) }));
        const merged = currentGroups.filter((group) => group.cities.length).map((group) => ({ ...group, cities: group.cities.slice(0, 8) }));
        if (merged.length) {
          cityGroups.splice(0, cityGroups.length, ...merged);
        }
      }
      renderCityOptions(cityInput.value);
      setLocationValidity(false, { allowBypass: true });
    } catch (err) {
      checkoutSettings = { enableMap: true, enableVerification: true, provider: 'google', center: { lat: 23.685, lon: 90.3563 }, zoom: 7 };
      setLocationValidity(false, { allowBypass: true });
    }
  }

  cityInput.addEventListener('change', () => {
    updateTotals();
    localStorage.setItem('sohoz_checkout_city', cityInput.value);
    if (checkoutSettings?.enableVerification === false) return;
    scheduleGeocode();
  });
  cityInput.addEventListener('input', () => {
    updateTotals();
    localStorage.setItem('sohoz_checkout_city', cityInput.value);
    if (checkoutSettings?.enableVerification === false) return;
    scheduleGeocode();
  });
  if (citySearchInput) {
    citySearchInput.addEventListener('input', (event) => {
      cityInput.value = event.target.value;
      renderCityOptions(event.target.value);
      if (!cityPicker?.classList.contains('is-open')) openCityDropdown();
      if (checkoutSettings?.enableVerification === false) return;
      scheduleGeocode();
    });
    citySearchInput.addEventListener('keydown', handleCityKeydown);
  }
  cityToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    if (cityPicker?.classList.contains('is-open')) {
      closeCityDropdown();
    } else {
      openCityDropdown();
    }
  });
  document.addEventListener('click', (event) => {
    if (cityPicker && !cityPicker.contains(event.target)) {
      closeCityDropdown();
    }
  });
  addressInput.addEventListener('input', () => {
    if (checkoutSettings?.enableVerification === false) return;
    scheduleGeocode();
  });

  summaryList.addEventListener('click', async (event) => {
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    const itemId = Number(control.dataset.id);
    const item = Cart.read().find((i) => i.id === itemId);
    if (!item) return;
    if (action === 'increase') {
      control.disabled = true;
      await adjustCartQuantity(item, item.qty + 1);
      control.disabled = false;
    } else if (action === 'decrease') {
      control.disabled = true;
      await adjustCartQuantity(item, item.qty - 1);
      control.disabled = false;
    } else if (action === 'remove') {
      await handleRemoveItem(itemId);
    }
  });
  function renderSummary() {
    const items = Cart.read();
    if (!items.length) {
      renderEmptyState();
      restoreSavedDistrict();
      updateTotals();
      return;
    }

    const rendered = items.map((i) => {
      const imageUrl = i.image || '/images/products/meridian-steel.svg';
      const safeName = escapeHtml(i.name || 'Product');
      const lineTotal = formatBDT(i.price * i.qty);
      const unitPrice = formatBDT(i.price);
      const attributes = getItemAttributes(i);
      const stockNote = getStockNote(i);
      const disableDecrease = i.qty <= 1 ? 'disabled' : '';
      const disableIncrease = i.stock !== undefined && i.stock !== null && i.qty >= i.stock ? 'disabled' : '';
      return `
      <div class="co-product-row" data-item-id="${i.id}">
        <div class="co-product-info">
          <img src="${escapeHtml(imageUrl)}" alt="${safeName}" loading="lazy" width="64" height="64">
          <div class="co-product-details">
            <div class="co-product-name">${safeName}</div>
            ${attributes.length ? `<div class="co-product-attributes">${attributes.map((attr) => `<div>${attr}</div>`).join('')}</div>` : ''}
            <div class="co-product-meta"><span>${unitPrice} each</span></div>
            <div class="co-product-controls">
              <button type="button" class="qty-btn" data-action="decrease" data-id="${i.id}" ${disableDecrease} aria-label="Decrease quantity">−</button>
              <span class="qty-value">${i.qty}</span>
              <button type="button" class="qty-btn" data-action="increase" data-id="${i.id}" ${disableIncrease} aria-label="Increase quantity">+</button>
              <button type="button" class="co-product-remove" data-action="remove" data-id="${i.id}">Remove</button>
            </div>
            ${stockNote ? `<div class="co-product-stock">${escapeHtml(stockNote)}</div>` : ''}
          </div>
        </div>
        <div class="co-product-total mono">${lineTotal}</div>
      </div>`;
    }).join('');

    summaryList.innerHTML = rendered;
    restoreSavedDistrict();
    updateTotals();
  }

  function updateTotals() {
    const subtotal = Cart.subtotal();
    const afterDiscount = Math.max(0, subtotal - appliedDiscount);
    const deliveryCharge = calculateDeliveryCharge(cityInput.value);
    subtotalEl.textContent = formatBDT(subtotal);
    deliveryChargeEl.textContent = getDeliveryChargeLabel(cityInput.value);
    if (appliedDiscount > 0) {
      discountRow.classList.remove('hidden');
      discountEl.textContent = '−' + formatBDT(appliedDiscount);
    } else {
      discountRow.classList.add('hidden');
    }
    totalEl.textContent = formatBDT(afterDiscount + (deliveryCharge === null ? 0 : deliveryCharge));
  }

  couponBtn.addEventListener('click', async () => {
    const code = couponInput.value.trim();
    if (!code) return;
    couponMsg.textContent = 'Checking...';
    couponMsg.className = 'form-note';
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: Cart.subtotal() }),
      });
      const data = await readJsonResponse(res, 'Could not validate coupon right now.');
      if (data.valid) {
        appliedDiscount = data.discount;
        appliedCode = data.code;
        couponMsg.textContent = `Code ${data.code} applied — you saved ${formatBDT(data.discount)}.`;
        couponMsg.style.color = 'var(--pine)';
      } else {
        appliedDiscount = 0; appliedCode = null;
        couponMsg.textContent = data.error || 'Invalid coupon code.';
        couponMsg.style.color = 'var(--danger)';
      }
    } catch (err) {
      couponMsg.textContent = 'Could not validate coupon right now.';
      couponMsg.style.color = 'var(--danger)';
    }
    updateTotals();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Placing order...';
    alertBox.className = 'alert';

    const fd = new FormData(form);
    const selectedCity = fd.get('city');
    if (!isValidDistrict(selectedCity)) {
      alertBox.textContent = 'Please select your City / District.';
      alertBox.className = 'alert alert-error show';
      btn.disabled = false;
      btn.textContent = 'Place order';
      return;
    }
    const payload = {
      customer_name: fd.get('name'),
      customer_email: fd.get('email') || `guest-${Date.now()}@local.invalid`,
      customer_phone: fd.get('phone'),
      shipping_address: fd.get('address'),
      city: selectedCity,
      latitude: verifiedLocation?.lat,
      longitude: verifiedLocation?.lon,
      place_id: verifiedLocation?.placeId,
      formatted_address: verifiedLocation?.formattedAddress,
      google_maps_url: verifiedLocation?.googleMapsUrl,
      postal_code: verifiedLocation?.postalCode || '',
      division: verifiedLocation?.division || '',
      country: verifiedLocation?.country || '',
      payment_method: 'Cash on Delivery',
      coupon_code: appliedCode,
      items: Cart.read().map((i) => ({ id: i.id, qty: i.qty })),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await readJsonResponse(res, 'Could not place order.');
      if (!res.ok) throw new Error(data?.error || 'Could not place order.');
      Cart.clear();
      form.classList.add('hidden');
      document.getElementById('checkout-summary-card').classList.add('hidden');
      successPanel.classList.remove('hidden');
      document.getElementById('success-order-no').textContent = data.order_no;
      successSubtotalEl.textContent = formatBDT(data.subtotal);
      successDeliveryChargeEl.textContent = formatBDT(data.delivery_charge ?? data.shipping_fee ?? 0);
      successDiscountEl.textContent = data.discount ? '−' + formatBDT(data.discount) : '৳0';
      successTotalEl.textContent = formatBDT(data.total);
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.className = 'alert alert-error show';
      btn.disabled = false;
      btn.textContent = 'Place order';
    }
  });

  loadCheckoutSettings();
  renderSummary();
})();
