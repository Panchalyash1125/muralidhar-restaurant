/**
 * Shared Neon/API-backed menu repository.
 * Admin writes go to PostgreSQL through the Express API.
 * Customer pages read the same server data, so every device stays in sync.
 */
const MenuService = (() => {
  const CHANGE_EVENT = 'muralidhar:menu-changed';
  const DEFAULT_MENU = [];
  let cache = [];
  let loaded = false;
  let pollTimer = null;
  let socket = null;

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

  function setCache(menu) {
    cache = (Array.isArray(menu) ? menu : [])
      .map(normalizeDish)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    loaded = true;
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: clone(cache) }));
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
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }

  async function refresh(forceAdmin = isAdminPage()) {
    try {
      const endpoint = forceAdmin ? '/api/admin/menu' : '/api/menu';
      const data = await request(`${endpoint}?_=${Date.now()}`);
      return setCache(data.data || []);
    } catch (error) {
      console.error('MenuService.refresh:', error);
      if (!loaded) setCache(DEFAULT_MENU);
      return clone(cache);
    }
  }

  function getMenu() {
    return clone(cache);
  }

  function getVisibleMenu() {
    return getMenu().filter(item => item.isAvailable);
  }

  function buildDishForm(dish) {
    const form = new FormData();
    form.append('name', dish.name || '');
    form.append('description', dish.description || '');
    form.append('price', String(dish.price ?? 0));
    // Backend accepts either an existing numeric category ID or a category name/slug.
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
      method: 'PUT',
      body: buildDishForm(updates)
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

    // Cross-device realtime sync when Socket.IO is available.
    if (!socket && typeof io === 'function') {
      try {
        socket = io({ transports: ['websocket', 'polling'], reconnection: true });
        socket.on('menu_updated', () => refresh(isAdminPage()));
      } catch (e) {
        console.warn('MenuService socket unavailable:', e);
      }
    }

    // Polling fallback also keeps phones updated if a socket is unavailable.
    if (!pollTimer) {
      pollTimer = setInterval(() => refresh(isAdminPage()), 10000);
    }

    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }

  // Start loading immediately. Pages can explicitly await refresh before first render.
  refresh(isAdminPage());

  return {
    refresh,
    getMenu,
    getVisibleMenu,
    addDish,
    updateDish,
    deleteDish,
    hideDish,
    showDish,
    subscribe
  };
})();
