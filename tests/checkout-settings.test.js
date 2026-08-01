const assert = require('assert');
const db = require('../server/db/database');
const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'checkout_settings'").get();
const settings = JSON.parse(settingsRow.value);
assert.strictEqual(settings.provider, 'google', 'checkout settings should default to Google Maps provider');
assert.strictEqual(settings.enableMap, true, 'checkout map should remain enabled');
assert.strictEqual(settings.enableVerification, true, 'checkout verification should remain enabled');
console.log('checkout settings defaults verified');
