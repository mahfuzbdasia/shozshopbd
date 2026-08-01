const db = require('../db/database');
const admin = db.prepare('SELECT id,email,name,created_at FROM admins LIMIT 1').get();
console.log(JSON.stringify(admin, null, 2));
