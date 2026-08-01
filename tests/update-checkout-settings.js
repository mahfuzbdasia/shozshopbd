const db = require('../server/db/database');
const value = JSON.stringify({
  enableMap: true,
  enableVerification: true,
  provider: 'google',
  apiKey: '',
  center: { lat: 23.685, lon: 90.3563 },
  zoom: 7,
  cities: ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', "Cox's Bazar", 'Cumilla', 'Gazipur', 'Narayanganj', 'Bogra', 'Dinajpur', 'Jessore', 'Savar', 'Tongi', 'Narsingdi', 'Tangail', 'Pabna', 'Kushtia', 'Feni', 'Noakhali', 'Brahmanbaria'],
});
db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at").run('checkout_settings', value);
console.log('checkout settings updated');
