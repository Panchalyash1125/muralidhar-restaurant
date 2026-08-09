/**
 * Shared LocalStorage-backed menu repository.
 * This is the single source of truth for Admin and Customer pages.
 */
const MenuService = (() => {
  const STORAGE_KEY = 'muralidhar_menu';
  const CHANGE_EVENT = 'muralidhar:menu-changed';

  const DEFAULT_MENU = [
    {
      id: 1,
      name: 'Cha',
      description: 'Fresh Hot Tea brewed with premium Assam tea leaves, ginger, and cardamom. Served steaming hot in traditional kulhad.',
      price: 10,
      image: '',
      category: 'beverages',
      categoryId: 'beverages',
      isVeg: true,
      isBestSeller: true,
      isAvailable: true,
      preparationTime: 5,
      displayOrder: 1
    },
    {
      id: 2,
      name: 'Poha',
      description: 'Fresh Gujarati Poha made with flattened rice, peanuts, curry leaves, and mustard seeds. Light, fluffy, and full of flavor.',
      price: 30,
      image: '',
      category: 'breakfast',
      categoryId: 'breakfast',
      isVeg: true,
      isBestSeller: true,
      isAvailable: true,
      preparationTime: 10,
      displayOrder: 2
    },
    {
      id: 3,
      name: 'Roti',
      description: 'Fresh Butter Roti made from whole wheat dough, cooked on tawa with pure desi ghee. Soft, warm, and melts in your mouth.',
      price: 15,
      image: '',
      category: 'bread',
      categoryId: 'bread',
      isVeg: true,
      isBestSeller: false,
      isAvailable: true,
      preparationTime: 8,
      displayOrder: 3
    }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));

  function normalizeDish(dish) {
    const category = String(dish.category || dish.categoryId || 'other').trim().toLowerCase();
    return {
      id: Number(dish.id),
      name: String(dish.name || '').trim(),
      description: String(dish.description || '').trim(),
      price: Number(dish.price) || 0,
      image: String(dish.image || '').trim(),
      category,
      categoryId: category,
      isVeg: dish.isVeg !== false,
      isBestSeller: Boolean(dish.isBestSeller),
      isAvailable: dish.isAvailable !== false,
      preparationTime: Number(dish.preparationTime) || 10,
      displayOrder: Number(dish.displayOrder) || 0
    };
  }

  function initialize() {
    if (!localStorage.getItem(STORAGE_KEY)) saveMenu(DEFAULT_MENU);
  }

  function getMenu() {
    initialize();
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!Array.isArray(parsed)) throw new Error('Stored menu is invalid');
      return parsed.map(normalizeDish).sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    } catch (error) {
      console.error('MenuService.getMenu:', error);
      saveMenu(DEFAULT_MENU);
      return clone(DEFAULT_MENU);
    }
  }

  function saveMenu(menu) {
    const normalized = (Array.isArray(menu) ? menu : []).map(normalizeDish);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: clone(normalized) }));
    return clone(normalized);
  }

  function nextId(menu) {
    return menu.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  }

  function addDish(dish) {
    const menu = getMenu();
    const created = normalizeDish({ ...dish, id: nextId(menu) });
    saveMenu([...menu, created]);
    return clone(created);
  }

  function updateDish(id, updates) {
    const numericId = Number(id);
    const menu = getMenu();
    const index = menu.findIndex(item => item.id === numericId);
    if (index === -1) throw new Error('Menu item not found');
    menu[index] = normalizeDish({ ...menu[index], ...updates, id: numericId });
    saveMenu(menu);
    return clone(menu[index]);
  }

  function deleteDish(id) {
    const numericId = Number(id);
    const menu = getMenu();
    const nextMenu = menu.filter(item => item.id !== numericId);
    if (nextMenu.length === menu.length) throw new Error('Menu item not found');
    saveMenu(nextMenu);
    return true;
  }

  const hideDish = id => updateDish(id, { isAvailable: false });
  const showDish = id => updateDish(id, { isAvailable: true });

  function getVisibleMenu() {
    return getMenu().filter(item => item.isAvailable);
  }

  function subscribe(callback) {
    const sameTabHandler = event => callback(clone(event.detail || getMenu()));
    const otherTabHandler = event => {
      if (event.key === STORAGE_KEY) callback(getMenu());
    };
    window.addEventListener(CHANGE_EVENT, sameTabHandler);
    window.addEventListener('storage', otherTabHandler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sameTabHandler);
      window.removeEventListener('storage', otherTabHandler);
    };
  }

  initialize();

  return { getMenu, getVisibleMenu, saveMenu, addDish, updateDish, deleteDish, hideDish, showDish, subscribe };
})();
