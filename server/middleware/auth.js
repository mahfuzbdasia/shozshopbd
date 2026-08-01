const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'SohozShopBD-dev-secret-change-in-production';

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' });
  try {
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    if (!payload || typeof payload !== 'object') throw new Error('Invalid token payload');
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = { requireAdmin, SECRET };
