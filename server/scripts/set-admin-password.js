const bcrypt = require('bcryptjs');
const db = require('../db/database');
const admin = db.prepare('SELECT id, email, name FROM admins LIMIT 1').get();
if (!admin) {
  console.error('No admin account found.');
  process.exit(1);
}
const newPassword = process.argv[2];
if (!newPassword) {
  console.error('Usage: node set-admin-password.js <new-password>');
  process.exit(1);
}
const hash = bcrypt.hashSync(newPassword, 10);
db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, admin.id);
console.log(`Admin password updated for ${admin.email} (${admin.name}).`);
