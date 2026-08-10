/**
 * ============================================
 * MURALIDHAR RESTAURANT - MENU MODULE
 * ============================================
 * Handles menu display, search, category filtering,
 * cart operations, and floating cart updates.
 */

// ============================================
// MENU STATE
// ============================================
const MenuState = {
  currentCategory: 'all',
  searchQuery: '',
  filteredItems: [],

  /**
   * Initialize menu state
   */
  init() {
    this.filteredItems = MenuService.getVisibleMenu();
    return this;
  },

  /**
   * Filter items by category and search query
   */
  filter() {
    this.filteredItems = MenuService.getVisibleMenu().filter(item => {
      // Category filter
      const itemCategory = String(item.category || '').trim().toLowerCase();
      const selectedCategory = String(this.currentCategory || 'all').trim().toLowerCase();
      const categoryMatch = selectedCategory === 'all' || itemCategory === selectedCategory;

      // Search filter (case-insensitive, matches name or description)
      const searchLower = this.searchQuery.toLowerCase().trim();
      const searchMatch = !searchLower || 
        item.name.toLowerCase().includes(searchLower) || 
        item.description.toLowerCase().includes(searchLower);

      return categoryMatch && searchMatch;
    });

    return this.filteredItems;
  },

  /**
   * Set active category
   */
  setCategory(category) {
    this.currentCategory = category;
    return this.filter();
  },

  /**
   * Set search query
   */
  setSearch(query) {
    this.searchQuery = query;
    return this.filter();
  }
};

// ============================================
// DOM ELEMENTS
// ============================================
const DOM = {
  header: null,
  tableNum: null,
  searchInput: null,
  searchClear: null,
  categoriesList: null,
  foodGrid: null,
  itemCount: null,
  noResults: null,
  floatingCart: null,
  cartCount: null,
  cartPrice: null
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM elements
  DOM.header = document.getElementById('header');
  DOM.tableNum = document.getElementById('tableNum');
  DOM.searchInput = document.getElementById('searchInput');
  DOM.searchClear = document.getElementById('searchClear');
  DOM.categoriesList = document.getElementById('categoriesList');
  DOM.foodGrid = document.getElementById('foodGrid');
  DOM.itemCount = document.getElementById('itemCount');
  DOM.noResults = document.getElementById('noResults');
  DOM.floatingCart = document.getElementById('floatingCart');
  DOM.cartCount = document.getElementById('cartCount');
  DOM.cartPrice = document.getElementById('cartPrice');

  // Validate table number
  validateTable();

  // Load the shared Neon menu before the first render.
  await MenuService.refresh(false);
  MenuState.init();
  renderCategories();
  renderMenu();
  updateFloatingCart();

  // Setup event listeners
  setupEventListeners();

  // Attach quantity/add-to-cart listener ONCE (event delegation).
  // This must not be called again on every render, otherwise duplicate
  // listeners stack up and clicks behave incorrectly.
  attachQuantityListeners();

  // Setup scroll behavior for header
  setupScrollBehavior();

  // Keep an already-open customer menu synchronized with Admin changes.
  MenuService.subscribe(() => {
    MenuState.filter();
    renderCategories();
    renderMenu();
  });
});

// Refresh quantities and totals when returning from Cart/Success via browser history.
window.addEventListener('pageshow', () => {
  if (!DOM.foodGrid) return;
  MenuState.init();
  renderCategories();
  renderMenu();
  updateFloatingCart();
});

// ============================================
// TABLE VALIDATION
// ============================================

/**
 * Validate table number from URL
 * Redirects to index if invalid
 */
function validateTable() {
  const table = URLUtils.getTableNumber();

  if (!table || !Validators.isValidTable(table)) {
    // Invalid table - redirect to entry page
    Toast.error('Invalid table number. Please scan QR code again.');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return;
  }

  // Display table number
  DOM.tableNum.textContent = table;

  // Store for session
  Storage.set('muralidhar_table', table);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Search input
  DOM.searchInput.addEventListener('input', Utils.debounce((e) => {
    const query = e.target.value;
    handleSearch(query);
  }, 200));

  // Search clear button
  DOM.searchClear.addEventListener('click', () => {
    DOM.searchInput.value = '';
    handleSearch('');
    DOM.searchInput.focus();
  });

  // Category chips
  DOM.categoriesList.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;

    handleCategoryChange(chip.dataset.category);

    // Update active state
    DOM.categoriesList.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });
}

// ============================================
// SCROLL BEHAVIOR
// ============================================

function setupScrollBehavior() {
  let lastScroll = 0;

  window.addEventListener('scroll', Utils.throttle(() => {
    const currentScroll = window.pageYOffset;

    // Add shadow on scroll
    if (currentScroll > 10) {
      DOM.header.classList.add('scrolled');
    } else {
      DOM.header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  }, 100));
}

// ============================================
// SEARCH HANDLER
// ============================================

/**
 * Handle search input changes
 * @param {string} query - Search query
 */
function handleSearch(query) {
  // Show/hide clear button
  DOM.searchClear.classList.toggle('hidden', !query);

  // Filter items
  MenuState.setSearch(query);
  renderMenu();
}


// ============================================
// DYNAMIC CATEGORY FILTERS
// ============================================

/**
 * Convert a stored category key such as "main-course" or "main_course"
 * into a readable label without changing the value used for filtering.
 * @param {string} category
 * @returns {string}
 */
function formatCategoryLabel(category) {
  return String(category || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

/**
 * Render category chips from the currently visible menu.
 * Only categories containing at least one visible dish are shown.
 */
function renderCategories() {
  if (!DOM.categoriesList) return;

  const categories = [...new Set(
    MenuService.getVisibleMenu()
      .map(item => String(item.category || '').trim().toLowerCase())
      .filter(Boolean)
  )].sort((a, b) => formatCategoryLabel(a).localeCompare(formatCategoryLabel(b)));

  // If the selected category no longer has a visible dish, fall back safely.
  if (MenuState.currentCategory !== 'all' && !categories.includes(MenuState.currentCategory)) {
    MenuState.currentCategory = 'all';
    MenuState.filter();
  }

  DOM.categoriesList.replaceChildren();

  const allChip = document.createElement('button');
  allChip.type = 'button';
  allChip.className = `category-chip ${MenuState.currentCategory === 'all' ? 'active' : ''}`;
  allChip.dataset.category = 'all';
  allChip.textContent = 'All Items';
  DOM.categoriesList.appendChild(allChip);

  categories.forEach(category => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `category-chip ${MenuState.currentCategory === category ? 'active' : ''}`;
    chip.dataset.category = category;
    chip.textContent = formatCategoryLabel(category);
    DOM.categoriesList.appendChild(chip);
  });
}

// ============================================
// CATEGORY HANDLER
// ============================================

/**
 * Handle category selection
 * @param {string} category - Category identifier
 */
function handleCategoryChange(category) {
  MenuState.setCategory(category);
  renderMenu();
}

// ============================================
// RENDER MENU
// ============================================

/**
 * Render food cards based on current filters
 */
function renderMenu() {
  const items = MenuState.filteredItems;

  // Update item count
  DOM.itemCount.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

  // Show/hide no results
  if (items.length === 0) {
    DOM.foodGrid.classList.add('hidden');
    DOM.noResults.classList.remove('hidden');
  } else {
    DOM.foodGrid.classList.remove('hidden');
    DOM.noResults.classList.add('hidden');
  }

  // Get current cart quantities for display
  const cartItems = CartManager.getItems();
  const cartMap = new Map(cartItems.map(item => [item.id, item.quantity]));

  // Render cards
  DOM.foodGrid.innerHTML = items.map((item, index) => createFoodCard(item, cartMap.get(item.id) || 0, index)).join('');
}

// ============================================
// FOOD CARD TEMPLATE
// ============================================

/**
 * Create HTML for a food card
 * @param {object} item - Menu item data
 * @param {number} cartQty - Current quantity in cart
 * @param {number} index - Item index for animation delay
 * @returns {string} HTML string
 */
function createFoodCard(item, cartQty, index) {
  const isInCart = cartQty > 0;

  // Generate placeholder image if real image not available
  const imageUrl = item.image || generatePlaceholderImage(item.name);

  // Badge HTML
  let badgeHtml = '';
  if (item.isVeg) {
    badgeHtml += '<span class="food-badge veg">Veg</span>';
  }
  if (item.isBestSeller) {
    badgeHtml += '<span class="food-badge best-seller">Best Seller</span>';
  }

  // Quantity control or Add button
  let actionHtml;
  if (isInCart) {
    actionHtml = `
      <div class="quantity-control active" data-item-id="${item.id}">
        <button class="qty-btn minus" data-action="decrease" data-item-id="${item.id}" aria-label="Decrease quantity">−</button>
        <span class="qty-value">${cartQty}</span>
        <button class="qty-btn plus" data-action="increase" data-item-id="${item.id}" aria-label="Increase quantity">+</button>
      </div>
    `;
  } else {
    actionHtml = `
      <button class="add-btn" data-item-id="${item.id}" data-action="add" aria-label="Add to cart">
        ADD
      </button>
    `;
  }

  return `
    <article class="food-card ${isInCart ? 'in-cart' : ''} fade-in-up" style="animation-delay: ${index * 0.05}s">
      <div class="food-image-wrapper">
        <img 
          src="${imageUrl}" 
          alt="${Validators.sanitize(item.name)}" 
          class="food-image"
          loading="lazy"
          onerror="this.src='${generatePlaceholderImage(item.name)}'"
        >
        ${badgeHtml}
      </div>
      <div class="food-content">
        <h3 class="food-name">${Validators.sanitize(item.name)}</h3>
        <p class="food-description">${Validators.sanitize(item.description)}</p>
        <div class="food-footer">
          <span class="food-price">
            <span class="currency">₹</span>${item.price.toFixed(0)}
          </span>
          ${actionHtml}
        </div>
      </div>
    </article>
  `;
}

// ============================================
// PLACEHOLDER IMAGE GENERATOR
// ============================================

/**
 * Generate SVG placeholder image for menu items
 * @param {string} name - Item name
 * @returns {string} SVG data URL
 */
function generatePlaceholderImage(name) {
  const colors = {
    'Cha': '#8B4513',
    'Poha': '#F4A460',
    'Roti': '#D2691E'
  };

  const bgColor = colors[name] || '#FF6B00';
  const firstLetter = name.charAt(0);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
      <rect width="400" height="240" fill="${bgColor}"/>
      <rect x="0" y="0" width="400" height="240" fill="url(#grad)" opacity="0.3"/>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:white;stop-opacity:0.3"/>
          <stop offset="100%" style="stop-color:black;stop-opacity:0.1"/>
        </linearGradient>
      </defs>
      <text x="200" y="130" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle" opacity="0.9">${firstLetter}</text>
      <text x="200" y="180" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" opacity="0.7">${name}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ============================================
// QUANTITY CONTROLS
// ============================================

/**
 * Attach event listeners to quantity buttons.
 * Guarded so calling this more than once never double-binds the
 * listener (which previously caused add/quantity clicks to misfire).
 */
function attachQuantityListeners() {
  if (DOM.foodGrid.dataset.listenerAttached === 'true') return;
  DOM.foodGrid.addEventListener('click', handleQuantityClick);
  DOM.foodGrid.dataset.listenerAttached = 'true';
}

/**
 * Handle quantity button clicks (event delegation)
 * @param {Event} e - Click event
 */
function handleQuantityClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const itemId = parseInt(btn.dataset.itemId);
  const action = btn.dataset.action;
  const item = MenuService.getVisibleMenu().find(i => i.id === itemId);

  if (!item) return;

  switch (action) {
    case 'add':
      addToCart(item);
      break;
    case 'increase':
      increaseQuantity(itemId);
      break;
    case 'decrease':
      decreaseQuantity(itemId);
      break;
  }
}

/**
 * Add item to cart
 * @param {object} item - Menu item
 */
function addToCart(item) {
  CartManager.addItem(item, 1);

  // Show toast
  Toast.success(`${item.name} added to cart!`);

  // Re-render and update cart
  renderMenu();
  updateFloatingCart();

  // Animate the floating cart
  animateFloatingCart();
}

/**
 * Increase item quantity
 * @param {number} itemId - Item ID
 */
function increaseQuantity(itemId) {
  const cart = CartManager.getItems();
  const item = cart.find(i => i.id === itemId);

  if (item) {
    CartManager.updateQuantity(itemId, item.quantity + 1);
    renderMenu();
    updateFloatingCart();
  }
}

/**
 * Decrease item quantity
 * @param {number} itemId - Item ID
 */
function decreaseQuantity(itemId) {
  const cart = CartManager.getItems();
  const item = cart.find(i => i.id === itemId);

  if (item) {
    if (item.quantity <= 1) {
      CartManager.removeItem(itemId);
      Toast.info('Item removed from cart');
    } else {
      CartManager.updateQuantity(itemId, item.quantity - 1);
    }

    renderMenu();
    updateFloatingCart();
  }
}

// ============================================
// FLOATING CART
// ============================================

/**
 * Update floating cart display
 */
function updateFloatingCart() {
  const totals = CartManager.getTotals();

  DOM.cartCount.textContent = totals.itemCount;
  DOM.cartPrice.textContent = Formatters.priceShort(totals.grandTotal);

  // Show/hide floating cart
  if (totals.itemCount > 0) {
    DOM.floatingCart.classList.add('visible');
  } else {
    DOM.floatingCart.classList.remove('visible');
  }
}

/**
 * Animate floating cart on add
 */
function animateFloatingCart() {
  DOM.floatingCart.style.transform = 'translateX(-50%) translateY(-4px) scale(1.05)';
  setTimeout(() => {
    DOM.floatingCart.style.transform = '';
  }, 200);
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Navigate to cart page
 */
function goToCart() {
  const table = URLUtils.getTableNumber();
  window.location.href = `cart.html?table=${table}`;
}

// ============================================
// OFFLINE HANDLING
// ============================================

window.addEventListener('offline', () => {
  Toast.warning('You are offline. Some features may not work.');
});

window.addEventListener('online', () => {
  Toast.success('Back online!');
});
