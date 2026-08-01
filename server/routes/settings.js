const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const POSITIONS = new Set(['top-left', 'overlay', 'pill']);
const geocodeCache = new Map();
const DEFAULT_CHECKOUT = {
  enableMap: true, enableVerification: true, provider: 'google', apiKey: '',
  center: { lat: 23.685, lon: 90.3563 }, zoom: 7, cities: [],
};

function readProductBadges() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('product_badges');
  try {
    return JSON.parse(row?.value || '{}');
  } catch (err) {
    return { enabled: true, position: 'top-left' };
  }
}
function readCheckoutSettings() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('checkout_settings');
  try { return { ...DEFAULT_CHECKOUT, ...JSON.parse(row?.value || '{}') }; } catch (err) { return DEFAULT_CHECKOUT; }
}
function readIntegrationSettings() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('integration_settings');
  try { return JSON.parse(row?.value || '{}'); } catch (err) { return {}; }
}

function normalizeLocationText(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,/#!$%^&*;:{}=_'"`~()\[\]\\|-]/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildBangladeshQuery(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return `${trimmed}, Bangladesh`;
}
function buildFallbackLocation(city, address) {
  const cityName = String(city || '').trim() || 'Dhaka';
  const normalizedCity = normalizeLocationText(cityName);
  const cityLookup = {
    dhaka: { lat: 23.8103, lon: 90.4125, division: 'Dhaka' },
    chittagong: { lat: 22.3569, lon: 91.7832, division: 'Chattogram' },
    chattogram: { lat: 22.3569, lon: 91.7832, division: 'Chattogram' },
    khulna: { lat: 22.8456, lon: 89.5403, division: 'Khulna' },
    rajshahi: { lat: 24.3636, lon: 88.6241, division: 'Rajshahi' },
    sylhet: { lat: 24.8949, lon: 91.8687, division: 'Sylhet' },
    barisal: { lat: 22.7010, lon: 90.3711, division: 'Barisal' },
    rangpur: { lat: 25.7439, lon: 89.2752, division: 'Rangpur' },
    mymensingh: { lat: 24.7553, lon: 90.4203, division: 'Mymensingh' },
    cumilla: { lat: 23.4607, lon: 91.1809, division: 'Cumilla' },
    narayanganj: { lat: 23.6235, lon: 90.5014, division: 'Dhaka' },
    gazipur: { lat: 23.9999, lon: 90.4203, division: 'Dhaka' },
    bogura: { lat: 24.8456, lon: 89.3770, division: 'Rajshahi' },
    jashore: { lat: 23.1667, lon: 89.2087, division: 'Khulna' },
    noakhali: { lat: 22.8726, lon: 91.0995, division: 'Chattogram' },
    feni: { lat: 22.6888, lon: 91.4304, division: 'Chattogram' },
  };
  const matchedCity = Object.entries(cityLookup).find(([key]) => normalizedCity === key || normalizedCity.includes(key) || key.includes(normalizedCity));
  const selected = matchedCity ? matchedCity[1] : { lat: 23.685, lon: 90.3563, division: 'Dhaka' };
  const addressText = String(address || '').trim() || cityName;
  const formattedAddress = `${addressText}, ${cityName}, Bangladesh`;
  return {
    lat: Number(selected.lat),
    lon: Number(selected.lon),
    placeId: '',
    formattedAddress,
    city: cityName,
    address: addressText,
    postalCode: '',
    division: selected.division || '',
    country: 'Bangladesh',
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${Number(selected.lat)},${Number(selected.lon)}`)}`,
    confidence: 'APPROXIMATE',
    matchedAutomatically: true,
  };
}
function buildCoordinateFallbackLocation(lat, lon) {
  const fallbackLat = Number.isFinite(lat) ? lat : 23.685;
  const fallbackLon = Number.isFinite(lon) ? lon : 90.3563;
  return {
    lat: fallbackLat,
    lon: fallbackLon,
    placeId: '',
    formattedAddress: `Selected location (${fallbackLat.toFixed(4)}, ${fallbackLon.toFixed(4)})`,
    city: '',
    address: 'Selected location',
    postalCode: '',
    division: '',
    country: 'Bangladesh',
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${fallbackLat},${fallbackLon}`)}`,
    confidence: 'APPROXIMATE',
    matchedAutomatically: true,
  };
}
function queryVariants(city, address) {
  const cleanCity = normalizeLocationText(city);
  const cleanAddress = normalizeLocationText(address).replace(/\b(rd|rd\.?|road)\b/g, 'road').replace(/\b(st|st\.?|street)\b/g, 'street');
  const compactAddress = cleanAddress.replace(/\b(house|flat|floor|apt|apartment)\s*/g, '').replace(/\s+/g, ' ').trim();
  const addressTokens = cleanAddress.split(' ').filter(Boolean);
  const abbreviatedAddress = addressTokens.length > 1 ? addressTokens.join(' ') : cleanAddress;
  const variants = [
    `${address}, ${city}, Bangladesh`,
    `${cleanAddress}, ${cleanCity}, Bangladesh`,
    `${abbreviatedAddress}, ${cleanCity}, Bangladesh`,
    `${compactAddress}, ${cleanCity}, Bangladesh`,
    `${cleanCity}, Bangladesh`,
    `${cleanAddress} ${cleanCity} Bangladesh`,
    `${compactAddress} ${cleanCity} Bangladesh`,
    `${address}, ${city}`,
  ];
  return [...new Set(variants.filter(Boolean))];
}
function scoreResult(result, city, address) {
  const haystack = normalizeLocationText(`${result.display_name || ''} ${result.address?.city || ''} ${result.address?.town || ''} ${result.address?.municipality || ''}`);
  const cityWords = normalizeLocationText(city).split(' ').filter((word) => word.length > 2);
  const addressWords = normalizeLocationText(address).split(' ').filter((word) => word.length > 2);
  const cityScore = cityWords.reduce((score, word) => score + (haystack.includes(word) ? 8 : 0), 0);
  const addressScore = addressWords.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
  const normalizedAddress = normalizeLocationText(address);
  const hasSharedTokens = normalizedAddress.split(' ').filter(Boolean).some((token) => haystack.includes(token));
  const hasCityMatch = cityWords.some((word) => haystack.includes(word));
  return cityScore + addressScore + (hasSharedTokens ? 3 : 0) + (hasCityMatch ? 2 : 0) + (result.type === 'house' || result.type === 'building' ? 5 : 0);
}
function scoreGoogleResult(result, city, address) {
  const components = Array.isArray(result.address_components) ? result.address_components : [];
  const addressTypes = components.flatMap((component) => component.types || []);
  const locationType = String(result.geometry?.location_type || '').toLowerCase();
  const locationScore = { rooftop: 100, range_interpolated: 90, geometric_center: 70, approximate: 40 }[locationType] || 0;
  const typeScore = { premise: 50, subpremise: 45, street_address: 40, establishment: 35, route: 30, neighborhood: 20, political: 5 };
  const typeBonus = addressTypes.reduce((score, type) => score + (typeScore[type] || 0), 0);
  const hasPreciseAddress = addressTypes.some((type) => ['premise', 'subpremise', 'street_address', 'establishment', 'route'].includes(type));
  const fuzzyScore = scoreResult(result, city, address);
  return locationScore + typeBonus + fuzzyScore + (hasPreciseAddress ? 10 : 0) + (result.formatted_address ? 2 : 0);
}
function pickAddressComponent(address, keys) {
  for (const key of keys) {
    const value = address?.[key];
    if (value) return String(value);
  }
  return '';
}
function buildLocationPayload(result, fallbackCity = '', fallbackAddress = '') {
  const address = result.address || {};
  const cityName = pickAddressComponent(address, ['city', 'town', 'municipality', 'village', 'suburb', 'city_district']) || fallbackCity;
  const addressParts = [address.house_number, address.road, address.suburb, address.village, address.town, address.city, address.city_district].filter(Boolean);
  const addressText = addressParts.length ? addressParts.join(', ') : (fallbackAddress || result.display_name || '');
  return {
    lat: Number(result.lat),
    lon: Number(result.lon),
    placeId: result.place_id ? String(result.place_id) : '',
    formattedAddress: result.display_name || `${addressText}, ${cityName}, Bangladesh`,
    city: cityName,
    address: addressText,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${result.lat},${result.lon}`)}&query_place_id=${encodeURIComponent(result.place_id || '')}`,
    matchedAutomatically: true,
  };
}
function rankGoogleResult(result, city = '', address = '') {
  return scoreGoogleResult(result, city, address);
}
function buildGooglePayload(result, fallbackCity = '', fallbackAddress = '') {
  const components = Array.isArray(result.address_components) ? result.address_components : [];
  const getComponent = (types) => components.find((component) => types.some((type) => component.types.includes(type)))?.long_name || '';
  const lat = typeof result.geometry?.location?.lat === 'function' ? result.geometry.location.lat() : Number(result.geometry?.location?.lat);
  const lon = typeof result.geometry?.location?.lng === 'function' ? result.geometry.location.lng() : Number(result.geometry?.location?.lng);
  const fullAddress = result.formatted_address || fallbackAddress || '';
  const city = getComponent(['administrative_area_level_2', 'locality', 'postal_town']) || getComponent(['administrative_area_level_1']) || fallbackCity || '';
  const division = getComponent(['administrative_area_level_1']) || '';
  const country = getComponent(['country']) || '';
  const postalCode = getComponent(['postal_code']) || '';
  return {
    lat,
    lon,
    placeId: result.place_id || '',
    formattedAddress: fullAddress,
    addressComponents: components,
    city,
    address: fullAddress,
    postalCode,
    division,
    country,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}&query_place_id=${encodeURIComponent(result.place_id || '')}`,
    confidence: String(result.geometry?.location_type || 'APPROXIMATE').toUpperCase(),
    matchedAutomatically: true,
  };
}

router.get('/product-badges', (req, res) => {
  const settings = readProductBadges();
  res.json({ enabled: settings.enabled !== false, position: POSITIONS.has(settings.position) ? settings.position : 'top-left' });
});

router.put('/product-badges', requireAdmin, (req, res) => {
  const current = readProductBadges();
  const settings = {
    enabled: req.body.enabled !== undefined ? !!req.body.enabled : current.enabled !== false,
    position: POSITIONS.has(req.body.position) ? req.body.position : (POSITIONS.has(current.position) ? current.position : 'top-left'),
  };
  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('product_badges', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at")
    .run(JSON.stringify(settings));
  res.json(settings);
});

router.get('/checkout', (req, res) => {
  const settings = readCheckoutSettings();
  res.json({ ...settings, apiKey: settings.apiKey || '' });
});

router.put('/checkout', requireAdmin, (req, res) => {
  const current = readCheckoutSettings();
  const cities = Array.isArray(req.body.cities)
    ? [...new Set(req.body.cities.map((city) => String(city).trim()).filter(Boolean))].slice(0, 200)
    : current.cities;
  const settings = {
    enableMap: req.body.enableMap !== undefined ? !!req.body.enableMap : current.enableMap,
    enableVerification: req.body.enableVerification !== undefined ? !!req.body.enableVerification : current.enableVerification,
    provider: req.body.provider === 'google' ? 'google' : 'openstreetmap',
    apiKey: typeof req.body.apiKey === 'string' ? req.body.apiKey.trim() : current.apiKey,
    center: { lat: Number(req.body.center?.lat) || current.center.lat, lon: Number(req.body.center?.lon) || current.center.lon },
    zoom: Math.min(18, Math.max(1, Number(req.body.zoom) || current.zoom)),
    cities,
  };
  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('checkout_settings', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at")
    .run(JSON.stringify(settings));
  res.json({ ...settings, apiKey: '' });
});

router.get('/integrations', requireAdmin, (req, res) => {
  const current = readIntegrationSettings();
  res.json({
    gtmId: current.gtmId || '',
    gaId: current.gaId || '',
    searchConsole: current.searchConsole || '',
    telegramNotification: current.telegramNotification || '',
    emailNotification: current.emailNotification || '',
    pixelSite: current.pixelSite || '',
  });
});

router.put('/integrations', requireAdmin, (req, res) => {
  const current = readIntegrationSettings();
  const settings = {
    gtmId: typeof req.body.gtmId === 'string' ? req.body.gtmId.trim() : current.gtmId || '',
    gaId: typeof req.body.gaId === 'string' ? req.body.gaId.trim() : current.gaId || '',
    searchConsole: typeof req.body.searchConsole === 'string' ? req.body.searchConsole.trim() : current.searchConsole || '',
    telegramNotification: typeof req.body.telegramNotification === 'string' ? req.body.telegramNotification.trim() : current.telegramNotification || '',
    emailNotification: typeof req.body.emailNotification === 'string' ? req.body.emailNotification.trim() : current.emailNotification || '',
    pixelSite: typeof req.body.pixelSite === 'string' ? req.body.pixelSite.trim() : current.pixelSite || '',
  };
  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('integration_settings', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at")
    .run(JSON.stringify(settings));
  res.json(settings);
});

router.get('/geocode', async (req, res) => {
  const city = String(req.query.city || '').trim();
  const address = String(req.query.address || '').trim();
  if (!city || !address) return res.status(400).json({ error: 'City and address are required.' });
  const key = `${normalizeLocationText(city)}|${normalizeLocationText(address)}`;
  if (geocodeCache.has(key)) return res.json(geocodeCache.get(key));
  const apiKey = String(req.query.apiKey || '').trim();
  const googleKey = apiKey || readCheckoutSettings().apiKey;
  if (!googleKey) {
    const fallback = buildFallbackLocation(city, address);
    geocodeCache.set(key, fallback);
    return res.json(fallback);
  }
  try {
    const variants = queryVariants(city, address);
    const allResults = [];
    for (const variant of variants) {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(buildBangladeshQuery(variant))}&key=${encodeURIComponent(googleKey)}`);
      const payload = await response.json();
      if (response.ok && payload.status === 'OK' && Array.isArray(payload.results)) {
        allResults.push(...payload.results.map((item) => ({ item, variant })));
      }
    }
    if (!allResults.length) {
      return res.status(404).json({ error: "We couldn't determine your delivery location. Please check your city or address." });
    }
    const ranked = allResults
      .map(({ item, variant }) => ({ item, variant, score: rankGoogleResult(item, city, address) + (variant.includes(city) ? 6 : 0) + (variant.includes(address) ? 4 : 0) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0].item;
    const result = buildGooglePayload(best, city, address);
    geocodeCache.set(key, result);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Geocoding service unavailable.' });
  }
});

router.get('/google-search', async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (!query) return res.status(400).json({ error: 'A search query is required.' });
  const key = `google-search|${normalizeLocationText(query)}`;
  if (geocodeCache.has(key)) return res.json(geocodeCache.get(key));
  const apiKey = String(req.query.apiKey || '').trim();
  const googleKey = apiKey || readCheckoutSettings().apiKey;
  if (!googleKey) {
    const fallback = buildFallbackLocation(query, '');
    geocodeCache.set(key, fallback);
    return res.json(fallback);
  }
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${query}, Bangladesh`)}&key=${encodeURIComponent(googleKey)}`);
    const payload = await response.json();
    if (!response.ok || payload.status !== 'OK' || !payload.results?.length) {
      return res.status(404).json({ error: payload.error_message || 'We could not find that location.' });
    }
    const best = payload.results.sort((a, b) => rankGoogleResult(b) - rankGoogleResult(a))[0];
    const result = buildGooglePayload(best);
    geocodeCache.set(key, result);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Search service unavailable.' });
  }
});

router.get('/google-place', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const placeId = String(req.query.place_id || '').trim();
  const apiKey = String(req.query.apiKey || '').trim();
  const googleKey = apiKey || readCheckoutSettings().apiKey;
  if (!googleKey) {
    const fallback = {
      lat: Number.isFinite(lat) ? lat : 23.685,
      lon: Number.isFinite(lon) ? lon : 90.3563,
      placeId: placeId || '',
      formattedAddress: placeId ? 'Selected location' : `${Number.isFinite(lat) ? lat : 23.685}, ${Number.isFinite(lon) ? lon : 90.3563}`,
      addressComponents: [],
      city: '',
      address: 'Selected location',
      postalCode: '',
      division: '',
      country: 'Bangladesh',
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${Number.isFinite(lat) ? lat : 23.685},${Number.isFinite(lon) ? lon : 90.3563}`)}`,
      confidence: 'APPROXIMATE',
      matchedAutomatically: true,
    };
    return res.json(fallback);
  }
  try {
    let detailsPayload = null;
    if (placeId) {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=address_component,formatted_address,geometry,place_id,name&key=${encodeURIComponent(googleKey)}`);
      detailsPayload = await response.json();
      if (!response.ok || detailsPayload.status !== 'OK' || !detailsPayload.result) return res.status(404).json({ error: detailsPayload.error_message || 'We could not retrieve place details.' });
    } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${encodeURIComponent(googleKey)}`);
      detailsPayload = await response.json();
      if (!response.ok || detailsPayload.status !== 'OK' || !detailsPayload.results?.length) return res.status(404).json({ error: detailsPayload.error_message || 'We could not retrieve the selected location.' });
      const best = detailsPayload.results.sort((a, b) => rankGoogleResult(b) - rankGoogleResult(a))[0];
      detailsPayload = { result: best };
    } else {
      return res.status(400).json({ error: 'Latitude/longitude or place ID is required.' });
    }
    const result = buildGooglePayload(detailsPayload.result);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Place details service unavailable.' });
  }
});

router.get('/reverse-geocode', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'Latitude and longitude are required.' });
  const key = `reverse|${lat.toFixed(6)}|${lon.toFixed(6)}`;
  if (geocodeCache.has(key)) return res.json(geocodeCache.get(key));
  const apiKey = String(req.query.apiKey || '').trim();
  const googleKey = apiKey || readCheckoutSettings().apiKey;
  if (!googleKey) {
    const fallback = buildCoordinateFallbackLocation(lat, lon);
    geocodeCache.set(key, fallback);
    return res.json(fallback);
  }
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${encodeURIComponent(googleKey)}`);
    const payload = await response.json();
    if (!response.ok || payload.status !== 'OK' || !payload.results?.length) {
      return res.status(404).json({ error: payload.error_message || 'Reverse geocoding failed.' });
    }
    const best = payload.results.sort((a, b) => rankGoogleResult(b) - rankGoogleResult(a))[0];
    const result = buildGooglePayload(best);
    geocodeCache.set(key, result);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Reverse geocoding service unavailable.' });
  }
});

module.exports = router;