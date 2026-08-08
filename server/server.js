require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./db/database');

const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const customersRoutes = require('./routes/customers');
const couponsRoutes = require('./routes/coupons');
const bannersRoutes = require('./routes/banners');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const settingsRoutes = require('./routes/settings');
const seoRoutes = require('./routes/seo');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '200kb' }));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const publicFormLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth/login', loginLimiter);
app.use('/api/contact', publicFormLimiter);
app.use('/api/newsletter', publicFormLimiter);

// ---- API ----
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/seo', seoRoutes);

app.get('/api/facebook-catalog.xml', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1').all();
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const escapeXml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const buildUrl = (value) => {
    if (!value) return '';
    return value.startsWith('http://') || value.startsWith('https://') ? value : `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
  };
  const itemsXml = products.map((product) => {
    const imageLink = buildUrl(product.image || '/images/products/meridian-steel.svg');
    const productUrl = `${baseUrl}/product.html?slug=${encodeURIComponent(product.slug)}`;
    const price = `${Number(product.price).toFixed(2)} BDT`;
    const salePrice = Number(product.old_price) > Number(product.price) ? `${Number(product.price).toFixed(2)} BDT` : '';
    return `      <item>
        <g:id>${escapeXml(product.sku)}</g:id>
        <title>${escapeXml(product.name)}</title>
        <description>${escapeXml(product.description || product.name)}</description>
        <link>${escapeXml(productUrl)}</link>
        <g:image_link>${escapeXml(imageLink)}</g:image_link>
        <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
        <g:condition>new</g:condition>
        <g:price>${escapeXml(price)}</g:price>
        ${salePrice ? `<g:sale_price>${escapeXml(salePrice)}</g:sale_price>` : ''}
        <g:brand>SOHOZ SHOP BD</g:brand>
        <g:product_type>${escapeXml(product.category)}</g:product_type>
        <g:google_product_category>${escapeXml(product.category)}</g:google_product_category>
      </item>`;
  }).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>SOHOZ SHOP BD Product Catalog</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Generated product feed for Facebook Catalog and dynamic sales feeds.</description>
${itemsXml}
  </channel>
</rss>`);
});

app.get('/api/facebook-catalog', (req, res) => {
  res.redirect(301, '/api/facebook-catalog.xml');
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---- Static sites ----
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Friendly URLs -> matching html file (kept simple & explicit for SEO clarity)
const pages = ['shop', 'product', 'about', 'contact', 'cart', 'checkout', 'order-tracking', 'faq'];
pages.forEach((p) => {
  app.get(`/${p}`, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', `${p}.html`)));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`SOHOZ SHOP BD server running -> http://localhost:${PORT}`);
  console.log(`Admin panel          -> http://localhost:${PORT}/admin/login.html`);
});
