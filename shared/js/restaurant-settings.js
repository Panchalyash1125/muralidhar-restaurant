/**
 * Database-backed restaurant branding/profile loader.
 * The public GET /api/settings/restaurant endpoint is the single source of truth.
 */
const RestaurantSettings = (() => {
  const DEFAULTS = {
    restaurantName: 'Restaurant',
    logo: null,
    phone: '',
    whatsapp: '',
    gstNumber: '',
    address: '',
    email: '',
    description: '',
    openingTime: '',
    closingTime: '',
    updatedAt: null
  };

  let current = { ...DEFAULTS };
  let socket = null;
  const listeners = new Set();

  function normalize(data = {}) {
    return {
      ...DEFAULTS,
      ...data,
      restaurantName: String(data.restaurantName || DEFAULTS.restaurantName).trim() || DEFAULTS.restaurantName,
      logo: data.logo ? String(data.logo) : null,
      phone: String(data.phone || ''),
      whatsapp: String(data.whatsapp || ''),
      gstNumber: String(data.gstNumber || ''),
      address: String(data.address || ''),
      email: String(data.email || ''),
      description: String(data.description || '')
    };
  }

  function setText(selector, value, fallback = '') {
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = value || fallback;
    });
  }

  function apply(data = current) {
    current = normalize(data);

    setText('[data-restaurant-name]', current.restaurantName, 'Restaurant');
    setText('[data-restaurant-phone]', current.phone, '');
    setText('[data-restaurant-whatsapp]', current.whatsapp, '');
    setText('[data-restaurant-gst]', current.gstNumber, '');
    setText('[data-restaurant-address]', current.address, '');
    setText('[data-restaurant-email]', current.email, '');

    document.querySelectorAll('[data-restaurant-description]').forEach(el => {
      if (current.description) el.textContent = current.description;
    });

    document.querySelectorAll('[data-restaurant-logo-image]').forEach(img => {
      if (current.logo) {
        img.src = current.logo;
        img.alt = `${current.restaurantName} logo`;
        img.style.display = '';
      } else {
        img.removeAttribute('src');
        img.style.display = 'none';
      }
    });
    document.querySelectorAll('[data-restaurant-logo-fallback]').forEach(el => {
      el.style.display = current.logo ? 'none' : '';
    });

    const pageTitle = document.documentElement.dataset.restaurantPageTitle;
    if (pageTitle) document.title = `${pageTitle} | ${current.restaurantName}`;

    const meta = document.querySelector('meta[name="description"][data-restaurant-meta]');
    if (meta) {
      const prefix = meta.dataset.restaurantMeta || '';
      meta.setAttribute('content', `${prefix}${current.restaurantName}`.trim());
    }

    listeners.forEach(fn => {
      try { fn({ ...current }); } catch (error) { console.error('RestaurantSettings listener:', error); }
    });
    window.dispatchEvent(new CustomEvent('muralidhar:restaurant-settings-changed', { detail: { ...current } }));
    return { ...current };
  }

  async function load() {
    const base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '/api';
    const response = await fetch(`${base}/settings/restaurant?_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }
    return apply(payload.data || {});
  }

  function subscribe(listener) {
    if (typeof listener === 'function') listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function initSocket() {
    if (socket || typeof io !== 'function') return;
    try {
      socket = io((typeof CONFIG !== 'undefined' && CONFIG.SOCKET_URL) ? CONFIG.SOCKET_URL : '/', {
        transports: ['websocket', 'polling'],
        reconnection: true
      });
      socket.on('settings_updated', payload => {
        if (!payload || payload.section === 'restaurant') load().catch(() => {});
      });
    } catch (error) {
      console.warn('Restaurant settings realtime sync unavailable:', error);
    }
  }

  function init() {
    apply(current);
    load().catch(error => console.warn('Restaurant settings load failed:', error));
    initSocket();
  }

  function get() { return { ...current }; }

  return { init, load, refresh: load, apply, get, subscribe };
})();

document.addEventListener('DOMContentLoaded', () => RestaurantSettings.init(), { once: true });
