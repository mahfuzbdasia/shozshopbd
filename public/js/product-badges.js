// Shared product badge settings and markup for the storefront.
const ProductBadges = (function () {
  let settingsPromise;

  function ready() {
    if (!settingsPromise) {
      settingsPromise = fetch('/api/settings/product-badges')
        .then((res) => (res.ok ? res.json() : { enabled: true, position: 'top-left' }))
        .catch(() => ({ enabled: true, position: 'top-left' }));
    }
    return settingsPromise;
  }

  function markup(product, settings) {
    if (!settings?.enabled) return '';
    const onSale = Number(product.old_price) > Number(product.price);
    const isNew = !!product.is_new;
    if (!onSale && !isNew) return '';
    const type = onSale && isNew ? 'new-sale' : onSale ? 'sale' : 'new';
    const label = type === 'new-sale' ? 'New Sale' : type === 'sale' ? 'Sale' : 'New';
    const position = ['top-left', 'overlay', 'pill'].includes(settings.position) ? settings.position : 'top-left';
    return `<span class="tag ${type} badge-position-${position}">${label}</span>`;
  }

  return { ready, markup };
})();
