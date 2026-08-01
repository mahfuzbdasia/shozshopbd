const db = require('../db/database');
const row = db.prepare('SELECT key, value FROM settings WHERE key = ?').get('integration_settings');
console.log(JSON.stringify(row, null, 2));
