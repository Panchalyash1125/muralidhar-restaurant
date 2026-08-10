/**
 * Shared Neon/API-backed menu repository.
 * - Neon/PostgreSQL is the source of truth.
 * - Last known good menu is cached locally only as a resilience fallback.
 * - Temporary network/429 errors NEVER replace a good menu with an empty list.
 * - Socket.IO is primary realtime sync; slow polling is only a fallback.
 */
const MenuService = (() => {
  const CHANGE_EVENT = 'muralidhar:menu-changed';
  const CACHE_KEY = 'muralidhar_menu_last_good_v3';
  const POLL_MS = 60000; // 60s fallback. Socket.IO handles normal realtime sync.

  let cache = [];
  let loaded = false;
  let lastRefreshOk = false;
  let pollTimer = null;
  let socket = null;
  let refreshPromise = null;

  const clone = value => JSON.parse(JSON.stringify(value));
  const isAdminPage = () => window.location.pathname.startsWith('/admin');

  function slugifyCategory(value) {
    return String(value || 'other')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'other';
  }

  function normalizeDish(dish) {
    const rawCategory = dish.category || dish.category_name || dish.categoryId || dish.category_id || 'other';
    const category = slugifyCategory(rawCategory);
    return {
      id: Number(dish.id),
      name: String(dish.name || '').trim(),
      description: String(dish.description || '').trim(),
      price: Number(dish.price) || 0,
      image: String(dish.image || dish.image_url || '').trim(),
      category,
      categoryId: dish.categoryId ?? dish.category_id ?? category,
      categoryLabel: String(dish.category || dish.category_name || rawCategory),
      isVeg: dish.isVeg !== undefined ? Boolean(dish.isVeg) : Boolean(dish.is_veg),
      isBestSeller: dish.isBestSeller !== undefined ? Boolean(dish.isBestSeller) : Boolean(dish.is_best_seller),
      isAvailable: dish.isAvailable !== undefined ? Boolean(dish.isAvailable) : dish.is_available !== false,
      preparationTime: Number(dish.preparationTime ?? dish.preparation_time) || 10,
      displayOrder: Number(dish.displayOrder ?? dish.display_order) || 0
    };
  }

  function normalizeMenu(menu) {
    return (Array.isArray(menu) ? menu : [])
      .map(normalizeDish)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
  }

  function signature(menu) {
    return JSON.stringify(menu.map(item => [
      item.id, item.name, item.description, item.price, item.image,
      item.category, item.categoryId, item.isVeg, item.isBestSeller,
      item.isAvailable, item.preparationTime, item.displayOrder
    ]));
  }

  function persistLastGood(menu) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), menu }));
    } catch (e) {
      console.warn('MenuService cache write failed:', e);
    }
  }

  function hydrateLastGood() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const menu = normalizeMenu(parsed && parsed.menu);
      cache = menu;
      loaded = true;
      return true;
    } catch (e) {
      console.warn('MenuService cache read failed:', e);
      return false;
    }
  }

  function setCache(menu, { notify = true, persist = true } = {}) {
    const next = normalizeMenu(menu);
    const changed = signature(next) !== signature(cache);
    cache = next;
    loaded = true;
    if (persist) persistLastGood(cache);

    // Avoid repaint/flicker every polling cycle when nothing changed.
    if (notify && changed) {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: clone(cache) }));
    }
    return clone(cache);
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const err = new Error(data.message || `HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }
    return data;
  }

  async function doRefresh(forceAdmin) {
    try {
      const endpoint = forceAdmin ? '/api/admin/menu' : '/api/menu';
      const data = await request(`${endpoint}?_=${Date.now()}`);
      lastRefreshOk = true;
      return setCache(data.data || []);
    } catch (error) {
      lastRefreshOk = false;
      console.error('MenuService.refresh:', error);

      // Critical safety rule: never turn a temporary fetch/429 failure into an empty menu.
      if (!loaded) hydrateLastGood();
      return clone(cache);
    }
  }

  async function refresh(forceAdmin = isAdminPage()) {
    // Deduplicate simultaneous startup/socket/poll requests in the same page.
    if (refreshPromise) return refreshPromise;
    refreshPromise = doRefresh(forceAdmin).finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  function getMenu() { return clone(cache); }
  function getVisibleMenu() { return getMenu().filter(item => item.isAvailable); }
  function isLoaded() { return loaded; }
  function wasLastRefreshSuccessful() { return lastRefreshOk; }

  function buildDishForm(dish) {
    const form = new FormData();
    form.append('name', dish.name || '');
    form.append('description', dish.description || '');
    form.append('price', String(dish.price ?? 0));
    form.append('category_id', String(dish.categoryId || dish.category || 'other'));
    form.append('is_veg', String(dish.isVeg !== false));
    form.append('is_best_seller', String(Boolean(dish.isBestSeller)));
    form.append('is_available', String(dish.isAvailable !== false));
    form.append('preparation_time', String(dish.preparationTime || 10));
    form.append('display_order', String(dish.displayOrder || 0));
    if (dish.imageFile instanceof File) form.append('image', dish.imageFile);
    return form;
  }

  async function addDish(dish) {
    const data = await request('/api/admin/menu', { method: 'POST', body: buildDishForm(dish) });
    await refresh(true);
    return normalizeDish(data.data);
  }

  async function updateDish(id, updates) {
    const data = await request(`/api/admin/menu/${Number(id)}`, {
      method: 'PUT', body: buildDishForm(updates)
    });
    await refresh(true);
    return normalizeDish(data.data);
  }

  async function deleteDish(id) {
    await request(`/api/admin/menu/${Number(id)}`, { method: 'DELETE' });
    await refresh(true);
    return true;
  }

  async function setAvailability(id, isAvailable) {
    await request(`/api/admin/menu/${Number(id)}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: Boolean(isAvailable) })
    });
    await refresh(true);
    return true;
  }

  const hideDish = id => setAvailability(id, false);
  const showDish = id => setAvailability(id, true);

  function subscribe(callback) {
    const handler = event => callback(clone(event.detail || cache));
    window.addEventListener(CHANGE_EVENT, handler);

    if (!socket && typeof io === 'function') {
      try {
        socket = io({ transports: ['websocket', 'polling'], reconnection: true });
        socket.on('menu_updated', () => refresh(isAdminPage()));
      } catch (e) {
        console.warn('MenuService socket unavailable:', e);
      }
    }

    if (!pollTimer) {
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') refresh(isAdminPage());
      }, POLL_MS);
    }

    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }

  // Hydrate instantly so navigation between menu/cart never flashes blank while network wakes up.
  hydrateLastGood();

  return {
    refresh, getMenu, getVisibleMenu, isLoaded, wasLastRefreshSuccessful,
    addDish, updateDish, deleteDish, hideDish, showDish, subscribe
  };
})();
