// SohozShopBD — shared site behaviour (nav, hero animation, reveals, footer form)
(function () {
  'use strict';

  // ---- mobile nav toggle ----
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open'));
    });
    links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
  }

  // ---- footer year ----
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

  // ---- scroll reveal ----
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // ---- animated chapter-ring hero background (signature element) ----
  function buildHeroSVG(container) {
    const w = container.clientWidth || 1200;
    const h = container.clientHeight || 700;
    const cx = w * 0.78;
    const cy = h * 0.42;
    const r = Math.min(w, h) * 0.42;

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');

    const mk = (tag, attrs) => {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    };

    // outer orbit rings (slow decorative rotation)
    svg.appendChild(mk('circle', { cx, cy, r: r * 1.32, class: 'hero-orbit' }));
    svg.appendChild(mk('circle', { cx, cy, r: r * 1.5, class: 'hero-orbit reverse' }));

    // main chapter ring
    svg.appendChild(mk('circle', { cx, cy, r, class: 'chapter-ring' }));
    svg.appendChild(mk('circle', { cx, cy, r: r * 0.86, class: 'chapter-ring' }));

    // ticks
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 - Math.PI / 2;
      const major = i % 5 === 0;
      const rOuter = r;
      const rInner = major ? r - 22 : r - 10;
      const x1 = cx + Math.cos(angle) * rOuter;
      const y1 = cy + Math.sin(angle) * rOuter;
      const x2 = cx + Math.cos(angle) * rInner;
      const y2 = cy + Math.sin(angle) * rInner;
      svg.appendChild(mk('line', { x1, y1, x2, y2, class: `chapter-tick${major ? ' major' : ''}` }));
    }

    // sweeping second hand
    const hand = mk('line', {
      x1: cx, y1: cy, x2: cx, y2: cy - r * 0.9, class: 'sweep-hand',
    });
    hand.style.setProperty('--cx', `${cx}px`);
    hand.style.setProperty('--cy', `${cy}px`);
    svg.appendChild(hand);
    svg.appendChild(mk('circle', { cx, cy, r: 4, fill: 'var(--pine)' }));

    container.innerHTML = '';
    container.appendChild(svg);
  }

  const heroCanvas = document.querySelector('.hero-canvas');
  if (heroCanvas) {
    buildHeroSVG(heroCanvas);
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => buildHeroSVG(heroCanvas), 200);
    });
  }

  // ---- footer newsletter ----
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input');
      const btn = newsletterForm.querySelector('button');
      const original = btn.textContent;
      try {
        btn.textContent = '...';
        await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: input.value }),
        });
        btn.textContent = 'Joined';
        input.value = '';
      } catch (err) {
        btn.textContent = 'Try again';
      } finally {
        setTimeout(() => (btn.textContent = original), 2200);
      }
    });
  }
})();
