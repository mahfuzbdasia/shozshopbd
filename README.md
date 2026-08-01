# SOHOZ SHOP BD — Watch Store (Full Stack)

A complete e-commerce website for a watch brand: static HTML/CSS/JS storefront + a Node.js/Express/SQLite backend with a full admin control panel.

## What's included

**Storefront** (`/public`)
- `index.html` — animated hero (sweeping watch-face background), value props, bestsellers, promo banners, testimonials, newsletter
- `shop.html` — all 20 watches with category filters, search, sort
- `product.html` — dynamic product detail page (specs, quantity, related items, JSON-LD schema)
- `about.html`, `contact.html` (working form), `faq.html` (with FAQ schema), `cart.html`, `checkout.html` (coupons + COD/bKash/card), `order-tracking.html`
- `sitemap.xml`, `robots.txt`, custom `404.html`

**Admin panel** (`/admin`) — full control of the site
- Dashboard with revenue/orders/stock stats
- Products: add / edit / delete / restock / hide
- Orders: view items, update status (Pending → Processing → Shipped → Delivered / Cancelled)
- Customers: auto-created from orders, with lifetime value
- Coupons: percent or flat discounts, min order, usage limits
- Banners: control the homepage promo strip
- Messages: contact form submissions + newsletter signups

**Backend** (`/server`) — Node.js + Express + SQLite (better-sqlite3), JWT-protected admin API.

## Getting started

```bash
npm install
npm run seed     # creates the database, 20 products, default admin, starter coupons/banners
npm start        # runs on http://localhost:3000
```

Then open:
- Storefront: **http://localhost:3000**
- Admin panel: **http://localhost:3000/admin/login.html**

### Default admin login
```
Email:    admin@SOHOZ SHOP BD.com
Password: SOHOZ SHOP BD@admin123
```
**Change this password before going live** — there's no self-service reset UI yet, so update it directly in the `admins` table or add one.

## Project structure

```
SOHOZ SHOP BD/
├── public/                 # storefront (served at /)
│   ├── css/style.css
│   ├── js/                 # main.js, cart.js, shop.js, product.js, checkout.js, contact.js, ...
│   ├── images/products/    # generated watch illustrations (SVG)
│   ├── *.html
│   ├── sitemap.xml, robots.txt
├── admin/                  # admin panel (served at /admin)
│   ├── css/admin.css
│   ├── js/admin-common.js
│   └── *.html
├── server/
│   ├── server.js           # Express entry point
│   ├── db/database.js      # SQLite schema
│   ├── db/seed.js          # seed script
│   ├── db/generate-assets.js  # generates the 20 product SVGs + seed JSON (already run)
│   ├── middleware/auth.js  # JWT guard for admin routes
│   └── routes/             # products, orders, customers, coupons, banners, auth, contact, newsletter
└── package.json
```

## Notes on the product images

Since no real product photography was available, each of the 20 watches has a unique **procedurally generated line-art SVG illustration** (varied case colors, dials, straps, complications) matching the site's minimal design language. Swap in real photography by replacing files in `public/images/products/` and updating the `image` field via the admin Products page (or directly in the database).

## Currency & region

Prices are in **BDT (৳)**, shipping logic assumes delivery within Bangladesh (free shipping over ৳10,000, otherwise ৳120 flat rate), and payment options are Cash on Delivery, bKash, and Card. Adjust these in:
- `server/routes/orders.js` (shipping threshold/fee)
- `public/checkout.html` (payment method options)

## Going to production

This is a fully working reference build. Before launching for real:
1. Change the default admin password and `JWT_SECRET` (set via a `.env` file — see `dotenv` usage in `server/server.js`).
2. Replace `https://SOHOZ SHOP BD-watches.example.com` with your real domain in `sitemap.xml`, `robots.txt`, and the `<meta>`/canonical tags across the HTML pages.
3. Wire up a real payment gateway (bKash/Nagad/SSLCommerz/Stripe) instead of the simulated payment methods.
4. Add HTTPS, a process manager (pm2), and a reverse proxy (nginx) in front of Express.
5. Swap in real product photography.
