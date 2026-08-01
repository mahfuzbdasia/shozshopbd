// SohozShopBD — /checkout.html page logic
(function () {
  const form = document.getElementById('checkout-form');
  const summaryList = document.getElementById('checkout-items');
  const subtotalEl = document.getElementById('co-subtotal');
  const discountRow = document.getElementById('co-discount-row');
  const discountEl = document.getElementById('co-discount');
  const shippingEl = document.getElementById('co-shipping');
  const totalEl = document.getElementById('co-total');
  const couponInput = document.getElementById('coupon-code');
  const couponBtn = document.getElementById('apply-coupon');
  const couponMsg = document.getElementById('coupon-msg');
  const successPanel = document.getElementById('checkout-success');
  const alertBox = document.getElementById('checkout-alert');
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

  cityInput.addEventListener('focus', () => openCityDropdown());
  cityInput.addEventListener('input', (event) => {
    if (citySearchInput) citySearchInput.value = event.target.value;
    renderCityOptions(event.target.value);
    if (!cityPicker?.classList.contains('is-open')) openCityDropdown();
    if (checkoutSettings?.enableVerification === false) return;
    scheduleGeocode();
  });
  cityInput.addEventListener('keydown', handleCityKeydown);
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
  function renderSummary() {
    const items = Cart.read();
    if (!items.length) {
      window.location.href = '/cart.html';
      return;
    }
    summaryList.innerHTML = items.map((i) => `
      <div class="co-line">
        <span>${i.name} <span class="sku-tag">×${i.qty}</span></span>
        <span>${formatBDT(i.price * i.qty)}</span>
      </div>`).join('');
    updateTotals();
  }

  function updateTotals() {
    const subtotal = Cart.subtotal();
    const afterDiscount = Math.max(0, subtotal - appliedDiscount);
    const shipping = afterDiscount >= 10000 ? 0 : 120;
    subtotalEl.textContent = formatBDT(subtotal);
    shippingEl.textContent = shipping === 0 ? 'Free' : formatBDT(shipping);
    if (appliedDiscount > 0) {
      discountRow.classList.remove('hidden');
      discountEl.textContent = '−' + formatBDT(appliedDiscount);
    } else {
      discountRow.classList.add('hidden');
    }
    totalEl.textContent = formatBDT(afterDiscount + shipping);
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
    const payload = {
      customer_name: fd.get('name'),
      customer_email: fd.get('email') || `guest-${Date.now()}@local.invalid`,
      customer_phone: fd.get('phone'),
      shipping_address: fd.get('address'),
      city: fd.get('city'),
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
      document.getElementById('success-total').textContent = formatBDT(data.total);
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
