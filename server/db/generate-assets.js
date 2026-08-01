// One-time generator: creates 20 unique minimal-line watch SVG illustrations
// and a matching products.json seed file. Run with: node generate-assets.js
const fs = require('fs');
const path = require('path');

const OUT_IMG = path.join(__dirname, '..', '..', 'public', 'images', 'products');
const OUT_JSON = path.join(__dirname, 'products.seed.json');

if (!fs.existsSync(OUT_IMG)) fs.mkdirSync(OUT_IMG, { recursive: true });

// ---- palette (matches site design tokens) ----
const INK = '#16181C';
const PAPER = '#FBFAF7';
const LINE = '#D8D6CE';
const PINE = '#1F4B3F';
const BRASS = '#B8935F';
const STEEL = '#8A9199';

function watchSVG({ caseColor, dialColor, strap, hasSubdials, hasDate, indexStyle, handColor }) {
  const cx = 150, cy = 150, r = 92;
  const caseR = r + 14;

  // hour indices
  let indices = '';
  const count = indexStyle === 'roman' ? 12 : indexStyle === 'dots' ? 12 : 4;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * (r - 8);
    const y1 = cy + Math.sin(angle) * (r - 8);
    const x2 = cx + Math.cos(angle) * (r - 18);
    const y2 = cy + Math.sin(angle) * (r - 18);
    if (indexStyle === 'dots') {
      indices += `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="2.6" fill="${handColor}" />`;
    } else {
      indices += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${handColor}" stroke-width="${i % 3 === 0 ? 3 : 1.4}" stroke-linecap="round"/>`;
    }
  }

  // minute chapter ring ticks
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const angle = (Math.PI * 2 * i) / 60 - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * (r - 4);
    const y1 = cy + Math.sin(angle) * (r - 4);
    const x2 = cx + Math.cos(angle) * (r - 8);
    const y2 = cy + Math.sin(angle) * (r - 8);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${LINE}" stroke-width="0.8"/>`;
  }

  const hourAngle = -40, minAngle = 70, secAngle = 160;
  const hx = cx + Math.cos((hourAngle * Math.PI) / 180) * (r * 0.45);
  const hy = cy + Math.sin((hourAngle * Math.PI) / 180) * (r * 0.45);
  const mx = cx + Math.cos((minAngle * Math.PI) / 180) * (r * 0.68);
  const my = cy + Math.sin((minAngle * Math.PI) / 180) * (r * 0.68);
  const sx = cx + Math.cos((secAngle * Math.PI) / 180) * (r * 0.72);
  const sy = cy + Math.sin((secAngle * Math.PI) / 180) * (r * 0.72);

  const subdials = hasSubdials ? `
    <circle cx="${cx - 40}" cy="${cy}" r="16" fill="none" stroke="${handColor}" stroke-width="1.2" opacity="0.7"/>
    <circle cx="${cx + 40}" cy="${cy}" r="16" fill="none" stroke="${handColor}" stroke-width="1.2" opacity="0.7"/>
    <circle cx="${cx}" cy="${cy + 44}" r="16" fill="none" stroke="${handColor}" stroke-width="1.2" opacity="0.7"/>
  ` : '';

  const dateWin = hasDate ? `
    <rect x="${cx + r - 30}" y="${cy - 8}" width="16" height="16" rx="2" fill="${PAPER}" stroke="${handColor}" stroke-width="1"/>
    <text x="${cx + r - 22}" y="${cy + 4}" font-size="9" text-anchor="middle" fill="${INK}" font-family="monospace">24</text>
  ` : '';

  let strapSVG = '';
  if (strap === 'leather') {
    strapSVG = `
      <path d="M ${cx - 34} ${cy - caseR} L ${cx + 34} ${cy - caseR} L ${cx + 28} 6 L ${cx - 28} 6 Z" fill="${BRASS}" opacity="0.85"/>
      <path d="M ${cx - 34} ${cy + caseR} L ${cx + 34} ${cy + caseR} L ${cx + 28} 294 L ${cx - 28} 294 Z" fill="${BRASS}" opacity="0.85"/>
      <line x1="${cx-20}" y1="30" x2="${cx+20}" y2="30" stroke="${INK}" stroke-width="1" opacity="0.3"/>
      <line x1="${cx-20}" y1="270" x2="${cx+20}" y2="270" stroke="${INK}" stroke-width="1" opacity="0.3"/>
    `;
  } else if (strap === 'metal') {
    strapSVG = `
      <path d="M ${cx - 36} ${cy - caseR} L ${cx + 36} ${cy - caseR} L ${cx + 36} 4 L ${cx - 36} 4 Z" fill="${STEEL}"/>
      <path d="M ${cx - 36} ${cy + caseR} L ${cx + 36} ${cy + caseR} L ${cx + 36} 296 L ${cx - 36} 296 Z" fill="${STEEL}"/>
      ${[0,1,2,3,4].map(i=>`<line x1="${cx-36}" y1="${20+i*10}" x2="${cx+36}" y2="${20+i*10}" stroke="${INK}" stroke-width="0.6" opacity="0.15"/>`).join('')}
      ${[0,1,2,3,4].map(i=>`<line x1="${cx-36}" y1="${230+i*10}" x2="${cx+36}" y2="${230+i*10}" stroke="${INK}" stroke-width="0.6" opacity="0.15"/>`).join('')}
    `;
  } else if (strap === 'mesh') {
    strapSVG = `
      <path d="M ${cx - 32} ${cy - caseR} L ${cx + 32} ${cy - caseR} L ${cx + 32} 4 L ${cx - 32} 4 Z" fill="${STEEL}" opacity="0.9"/>
      <path d="M ${cx - 32} ${cy + caseR} L ${cx + 32} ${cy + caseR} L ${cx + 32} 296 L ${cx - 32} 296 Z" fill="${STEEL}" opacity="0.9"/>
      <pattern id="mesh" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0 L6 6 M6 0 L0 6" stroke="${INK}" stroke-width="0.4" opacity="0.25"/></pattern>
      <rect x="${cx-32}" y="4" width="64" height="${cy-caseR-4}" fill="url(#mesh)"/>
      <rect x="${cx-32}" y="${cy+caseR}" width="64" height="${296-(cy+caseR)}" fill="url(#mesh)"/>
    `;
  } else { // rubber
    strapSVG = `
      <path d="M ${cx - 34} ${cy - caseR} L ${cx + 34} ${cy - caseR} L ${cx + 34} 4 L ${cx - 34} 4 Z" fill="${INK}" opacity="0.85"/>
      <path d="M ${cx - 34} ${cy + caseR} L ${cx + 34} ${cy + caseR} L ${cx + 34} 296 L ${cx - 34} 296 Z" fill="${INK}" opacity="0.85"/>
      ${[0,1,2,3,4,5].map(i=>`<line x1="${cx-34}" y1="${16+i*8}" x2="${cx+34}" y2="${16+i*8}" stroke="${PAPER}" stroke-width="0.8" opacity="0.2"/>`).join('')}
    `;
  }

  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="300" fill="${PAPER}"/>
  ${strapSVG}
  <circle cx="${cx}" cy="${cy}" r="${caseR}" fill="${caseColor}" />
  <circle cx="${cx}" cy="${cy}" r="${caseR}" fill="none" stroke="${INK}" stroke-width="1" opacity="0.15"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${dialColor}" />
  ${ticks}
  ${indices}
  ${subdials}
  ${dateWin}
  <line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${handColor}" stroke-width="4" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="${handColor}" stroke-width="2.6" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${PINE}" stroke-width="1.2" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="4" fill="${handColor}"/>
  <text x="150" y="${cy+35}" font-size="7" text-anchor="middle" fill="${handColor}" font-family="Georgia, serif" letter-spacing="1" opacity="0.8">SOHOZ SHOP BD</text>
</svg>`;
}

const CASE_STEEL = '#C7CCD1', CASE_GOLD = '#C9A66B', CASE_BLACK = '#25282C', CASE_ROSE = '#D8B4A0';

const products = [
  { name: 'Meridian Steel', category: 'Classic', price: 8500, movement: 'Automatic', caseMm: 40, strap: 'leather', case: CASE_STEEL, dial: '#F4F2EC', hands: INK, sub: false, date: true, idx: 'baton' },
  { name: 'Solstice Noir', category: 'Classic', price: 9200, movement: 'Automatic', caseMm: 40, strap: 'leather', case: CASE_BLACK, dial: '#1B1D20', hands: '#D8D6CE', sub: false, date: true, idx: 'baton' },
  { name: 'Equinox Rose', category: 'Classic', price: 10500, movement: 'Automatic', caseMm: 36, strap: 'leather', case: CASE_ROSE, dial: '#FBF3EE', hands: '#7A5C4E', sub: false, date: false, idx: 'roman' },
  { name: 'Zenith Chrono', category: 'Chronograph', price: 15800, movement: 'Quartz Chrono', caseMm: 42, strap: 'metal', case: CASE_STEEL, dial: '#1B1D20', hands: '#EDEBE4', sub: true, date: true, idx: 'baton' },
  { name: 'Vector Racing', category: 'Chronograph', price: 16900, movement: 'Quartz Chrono', caseMm: 43, strap: 'rubber', case: CASE_BLACK, dial: '#B02E26', hands: '#EDEBE4', sub: true, date: false, idx: 'baton' },
  { name: 'Apex Split-Second', category: 'Chronograph', price: 21500, movement: 'Automatic Chrono', caseMm: 42, strap: 'metal', case: CASE_STEEL, dial: '#F4F2EC', hands: INK, sub: true, date: true, idx: 'baton' },
  { name: 'Horizon Dive 300', category: 'Diver', price: 12400, movement: 'Automatic', caseMm: 41, strap: 'rubber', case: CASE_BLACK, dial: '#0F3D3A', hands: '#EDEBE4', sub: false, date: true, idx: 'dots' },
  { name: 'Nadir Abyss', category: 'Diver', price: 13800, movement: 'Automatic', caseMm: 44, strap: 'rubber', case: CASE_BLACK, dial: '#101418', hands: '#8FB6AE', sub: false, date: true, idx: 'dots' },
  { name: 'Cardinal Reef', category: 'Diver', price: 11600, movement: 'Automatic', caseMm: 40, strap: 'metal', case: CASE_STEEL, dial: '#123A52', hands: '#EDEBE4', sub: false, date: true, idx: 'dots' },
  { name: 'Aurora Slim', category: 'Minimalist', price: 6200, movement: 'Quartz', caseMm: 38, strap: 'leather', case: CASE_STEEL, dial: '#FBFAF7', hands: INK, sub: false, date: false, idx: 'dots' },
  { name: 'Vesper Line', category: 'Minimalist', price: 5800, movement: 'Quartz', caseMm: 36, strap: 'leather', case: CASE_GOLD, dial: '#FBF3EE', hands: '#7A5C4E', sub: false, date: false, idx: 'dots' },
  { name: 'Dawn Mono', category: 'Minimalist', price: 5400, movement: 'Quartz', caseMm: 38, strap: 'leather', case: CASE_BLACK, dial: '#1B1D20', hands: '#D8D6CE', sub: false, date: false, idx: 'dots' },
  { name: 'Polaris GMT', category: 'Sport', price: 17200, movement: 'Automatic GMT', caseMm: 41, strap: 'metal', case: CASE_STEEL, dial: '#122036', hands: '#EDEBE4', sub: false, date: true, idx: 'baton' },
  { name: 'Compass Field', category: 'Sport', price: 7600, movement: 'Automatic', caseMm: 40, strap: 'rubber', case: CASE_BLACK, dial: '#2E3B2C', hands: '#EDEBE4', sub: false, date: true, idx: 'baton' },
  { name: 'Longitude Pilot', category: 'Sport', price: 14200, movement: 'Automatic', caseMm: 42, strap: 'leather', case: CASE_BLACK, dial: '#1B1D20', hands: '#EDEBE4', sub: false, date: true, idx: 'baton' },
  { name: 'Celestia Moonphase', category: 'Classic', price: 26800, movement: 'Automatic Moonphase', caseMm: 40, strap: 'leather', case: CASE_GOLD, dial: '#0E1B33', hands: '#C9A66B', sub: true, date: true, idx: 'roman' },
  { name: 'Orbit Skeleton', category: 'Classic', price: 24500, movement: 'Manual Skeleton', caseMm: 41, strap: 'leather', case: CASE_STEEL, dial: '#F4F2EC', hands: INK, sub: false, date: false, idx: 'baton' },
  { name: 'Twilight Automatic', category: 'Classic', price: 9800, movement: 'Automatic', caseMm: 39, strap: 'leather', case: CASE_ROSE, dial: '#2A2320', hands: '#D8B4A0', sub: false, date: true, idx: 'baton' },
  { name: 'Astra Two-Tone', category: 'Classic', price: 11900, movement: 'Automatic', caseMm: 40, strap: 'metal', case: CASE_GOLD, dial: '#F4F2EC', hands: '#7A5C4E', sub: false, date: true, idx: 'baton' },
  { name: 'Latitude Mesh', category: 'Minimalist', price: 6900, movement: 'Quartz', caseMm: 37, strap: 'mesh', case: CASE_STEEL, dial: '#FBFAF7', hands: INK, sub: false, date: false, idx: 'dots' },
];

const waterByCat = { Diver: '300m', Sport: '100m', Chronograph: '50m', Classic: '30m', Minimalist: '30m' };
const descByCat = {
  Classic: 'A refined dress watch built for everyday elegance, pairing a clean dial with a considered case profile.',
  Chronograph: 'A precision chronograph for timing what matters, with a legible dial and confident wrist presence.',
  Diver: 'A dive-ready tool watch rated for real depth, with high-contrast markers built for low-light legibility.',
  Minimalist: 'A pared-back dial with no clutter and no date window drama — just clean, considered timekeeping.',
  Sport: 'Built for movement: a durable case and a dial designed to stay legible wherever the day takes you.',
};

const seed = products.map((p, i) => {
  const id = i + 1;
  const sku = `KRS-${String(id).padStart(3, '0')}`;
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const svg = watchSVG({ caseColor: p.case, dialColor: p.dial, strap: p.strap, hasSubdials: p.sub, hasDate: p.date, indexStyle: p.idx, handColor: p.hands });
  fs.writeFileSync(path.join(OUT_IMG, `${slug}.svg`), svg);
  const onSale = i % 5 === 0;
  return {
    id, sku, slug,
    name: `SOHOZ SHOP BD ${p.name}`,
    category: p.category,
    price: p.price,
    old_price: onSale ? Math.round(p.price * 1.18) : null,
    movement: p.movement,
    case_mm: p.caseMm,
    strap: p.strap.charAt(0).toUpperCase() + p.strap.slice(1),
    water_resist: waterByCat[p.category],
    description: descByCat[p.category],
    image: `/images/products/${slug}.svg`,
    stock: 6 + ((id * 7) % 20),
    rating: (4 + ((id % 10) / 10)).toFixed(1),
    reviews: 12 + ((id * 13) % 140),
    is_new: i % 4 === 0,
    is_bestseller: i % 3 === 0,
  };
});

fs.writeFileSync(OUT_JSON, JSON.stringify(seed, null, 2));
console.log(`Generated ${seed.length} product SVGs -> ${OUT_IMG}`);
console.log(`Generated seed data -> ${OUT_JSON}`);
