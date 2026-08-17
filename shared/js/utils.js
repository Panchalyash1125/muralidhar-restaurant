/**
 * ============================================
 * MURALIDHAR RESTAURANT - SHARED UTILITIES
 * ============================================
 * Common functions used across all frontend modules
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  API_BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api',
  SOCKET_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '/',
  APP_NAME: 'Muralidhar Restaurant',
  CURRENCY: '₹',
  GST_RATE: 0.05, // 5% GST
  OTP_EXPIRY: 120, // 2 minutes in seconds
  OTP_MAX_ATTEMPTS: 3,
  TABLE_COUNT: 12,
};

// ============================================
// STORAGE HELPERS (LocalStorage with expiry)
// ============================================
const Storage = {
  /**
   * Store data with optional expiry time
   * @param {string} key - Storage key
   * @param {any} value - Data to store
   * @param {number} ttl - Time to live in seconds (optional)
   */
  set(key, value, ttl = null) {
    const item = {
      value: value,
      timestamp: Date.now(),
      ttl: ttl ? ttl * 1000 : null
    };
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.error('Storage.set error:', e);
    }
  },

  /**
   * Retrieve data, returns null if expired
   * @param {string} key - Storage key
   * @returns {any} Stored value or null
   */
  get(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);

      // Check if expired
      if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.value;
    } catch (e) {
      console.error('Storage.get error:', e);
      return null;
    }
  },

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   */
  remove(key) {
    localStorage.removeItem(key);
  },

  /**
   * Clear all app-related storage
   */
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('muralidhar_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// ============================================
// API CLIENT
// ============================================
const API = {
  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {object} options - Fetch options
   * @returns {Promise} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'same-origin'
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, mergedOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * GET request
   */
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  /**
   * POST request
   */
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * PUT request
   */
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * DELETE request
   */
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// ============================================
// URL UTILITIES
// ============================================
const URLUtils = {
  /**
   * Get URL query parameter value
   * @param {string} param - Parameter name
   * @returns {string|null} Parameter value
   */
  getParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },

  /**
   * Build URL with query parameters
   * @param {string} base - Base URL
   * @param {object} params - Query parameters
   * @returns {string} Complete URL
   */
  buildUrl(base, params = {}) {
    const url = new URL(base, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  },

  /**
   * Get current table number from URL
   * @returns {number|null} Table number
   */
  getTableNumber() {
    const table = this.getParam('table');
    return table ? parseInt(table, 10) : null;
  }
};

// ============================================
// FORMATTERS
// ============================================
const Formatters = {
  /**
   * Format price with currency symbol
   * @param {number} amount - Amount to format
   * @returns {string} Formatted price
   */
  price(amount) {
    if (amount === null || amount === undefined) return `${CONFIG.CURRENCY}0`;
    return `${CONFIG.CURRENCY}${amount.toFixed(2)}`;
  },

  /**
   * Format price without decimals for whole numbers
   * @param {number} amount - Amount to format
   * @returns {string} Formatted price
   */
  priceShort(amount) {
    if (amount === null || amount === undefined) return `${CONFIG.CURRENCY}0`;
    const rounded = Math.round(amount);
    return `${CONFIG.CURRENCY}${rounded}`;
  },

  /**
   * Format date to readable string
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date
   */
  date(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  },

  /**
   * Format time to readable string
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted time
   */
  time(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },

  /**
   * Format datetime
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted datetime
   */
  datetime(date) {
    return `${this.date(date)} ${this.time(date)}`;
  },

  /**
   * Format phone number (Indian format)
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone
   */
  phone(phone) {
    if (!phone || phone.length !== 10) return phone;
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  },

  /**
   * Format order number with leading zeros
   * @param {number} num - Order number
   * @returns {string} Formatted order number
   */
  orderNumber(num) {
    return `#${String(num).padStart(4, '0')}`;
  },

  /**
   * Format bill number
   * @param {number} num - Bill number
   * @returns {string} Formatted bill number
   */
  billNumber(num) {
    return `BILL-${String(num).padStart(6, '0')}`;
  }
};

// ============================================
// VALIDATORS
// ============================================
const Validators = {
  /**
   * Validate Indian mobile number (10 digits)
   * @param {string} phone - Phone number
   * @returns {boolean} Is valid
   */
  isValidPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleanPhone);
  },

  /**
   * Validate OTP (6 digits)
   * @param {string} otp - OTP code
   * @returns {boolean} Is valid
   */
  isValidOTP(otp) {
    return /^\d{6}$/.test(otp);
  },

  /**
   * Validate quantity (positive integer)
   * @param {number} qty - Quantity
   * @returns {boolean} Is valid
   */
  isValidQuantity(qty) {
    return Number.isInteger(qty) && qty > 0 && qty <= 99;
  },

  /**
   * Validate table number
   * @param {number} table - Table number
   * @returns {boolean} Is valid
   */
  isValidTable(table) {
    return Number.isInteger(table) && table >= 1 && table <= CONFIG.TABLE_COUNT;
  },

  /**
   * Sanitize input to prevent XSS
   * @param {string} input - User input
   * @returns {string} Sanitized string
   */
  sanitize(input) {
    if (typeof input !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }
};

// ============================================
// CART STATE MANAGER
// ============================================
const CartManager = {
  BASE_CART_KEY: 'muralidhar_cart',
  BASE_SESSION_KEY: 'muralidhar_session',

  /** Return the current table safely from the URL. */
  getTableNumber() {
    const table = URLUtils.getTableNumber();
    return Validators.isValidTable(table) ? table : null;
  },

  /** Keep carts isolated between individual table browser links. */
  getCartKey() {
    const table = this.getTableNumber();
    return table ? `${this.BASE_CART_KEY}_table_${table}` : this.BASE_CART_KEY;
  },

  getSessionKey() {
    const table = this.getTableNumber();
    return table ? `${this.BASE_SESSION_KEY}_table_${table}` : this.BASE_SESSION_KEY;
  },

  /** Remove legacy global cart data so it cannot reappear on another table. */
  cleanupLegacyStorage() {
    Storage.remove(this.BASE_CART_KEY);
    Storage.remove(this.BASE_SESSION_KEY);
  },

  getItems() {
    this.cleanupLegacyStorage();
    return Storage.get(this.getCartKey()) || [];
  },

  addItem(item, quantity = 1) {
    const cart = this.getItems();
    const existingIndex = cart.findIndex(c => c.id === item.id);

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        category: item.category || item.categoryId || 'other',
        categoryId: item.categoryId || item.category || 'other',
        isVeg: item.isVeg !== false,
        isBestSeller: Boolean(item.isBestSeller),
        preparationTime: Number(item.preparationTime) || 10,
        quantity
      });
    }

    this.saveCart(cart);
    return cart;
  },

  updateQuantity(itemId, quantity) {
    let cart = this.getItems();
    if (quantity <= 0) {
      cart = cart.filter(item => item.id !== itemId);
    } else {
      const item = cart.find(c => c.id === itemId);
      if (item) item.quantity = quantity;
    }
    this.saveCart(cart);
    return cart;
  },

  removeItem(itemId) {
    const cart = this.getItems().filter(item => item.id !== itemId);
    this.saveCart(cart);
    return cart;
  },

  clear() {
    Storage.remove(this.getCartKey());
  },

  getTotals() {
    const cart = this.getItems();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gst = subtotal * CONFIG.GST_RATE;
    const grandTotal = subtotal + gst;
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, gst, grandTotal, itemCount, items: cart };
  },

  saveCart(cart) {
    Storage.set(this.getCartKey(), cart);
  },

  getSessionId() {
    return Storage.get(this.getSessionKey());
  },

  setSessionId(sessionId) {
    if (sessionId) Storage.set(this.getSessionKey(), sessionId);
  },

  clearSessionId() {
    Storage.remove(this.getSessionKey());
  },

  clearSession() {
    this.clearSessionId();
    this.clear();
  }
};

// ============================================
// ACTIVE TABLE ORDER (BACKEND SOURCE OF TRUTH)
// ============================================
const ActiveTableOrder = {
  current: null,

  getCacheKey(table = URLUtils.getTableNumber()) {
    return `muralidhar_active_order_table_${table}`;
  },

  getCached(table = URLUtils.getTableNumber()) {
    if (this.current && Number(this.current.tableNumber) === Number(table)) return this.current;
    return Storage.get(this.getCacheKey(table));
  },

  async refresh(table = URLUtils.getTableNumber()) {
    if (!Validators.isValidTable(Number(table))) {
      this.current = { isActive: false, tableNumber: table };
      return this.current;
    }

    const cacheKey = this.getCacheKey(table);
    const previousActive = Storage.get(cacheKey);
    const res = await API.get(`/tables/${Number(table)}/active-order`);
    const active = (res && res.data) || { isActive: false, tableNumber: Number(table) };
    this.current = active;

    // If Counter closed the previous bill (or a new customer already started a
    // different bill), discard any unsent cart from that old table session.
    const activeBillChanged = previousActive && previousActive.isActive &&
      (!active.isActive || Number(previousActive.billId) !== Number(active.billId));
    if (activeBillChanged) CartManager.clear();

    if (active.isActive) {
      Storage.set(cacheKey, active);
      Storage.set(`muralidhar_customer_${table}`, {
        name: active.customerName || '',
        phone: active.customerPhone || ''
      });
      CartManager.setSessionId(active.sessionId);
    } else {
      Storage.remove(cacheKey);
      Storage.remove(`muralidhar_customer_${table}`);
      // A paid/closed table must not reuse the previous customer's session id.
      CartManager.clearSessionId();
    }

    return active;
  }
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================
const Toast = {
  container: null,

  /**
   * Initialize toast container
   */
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  /**
   * Show toast message
   * @param {string} message - Message to display
   * @param {string} type - Type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in ms
   */
  show(message, type = 'info', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span style="font-size: 1.2rem;">${icons[type]}</span>
      <span>${Validators.sanitize(message)}</span>
    `;

    this.container.appendChild(toast);

    // Remove after duration
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(message) { this.show(message, 'success'); },
  error(message) { this.show(message, 'error'); },
  warning(message) { this.show(message, 'warning'); },
  info(message) { this.show(message, 'info'); }
};

// ============================================
// MODAL SYSTEM
// ============================================
const Modal = {
  /**
   * Create and show modal
   * @param {object} options - Modal options
   * @returns {HTMLElement} Modal element
   */
  show(options = {}) {
    const {
      title = '',
      content = '',
      showClose = true,
      onClose = null,
      className = ''
    } = options;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      z-index: 300;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.3s ease;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = `modal ${className}`;
    modal.style.cssText = `
      background: var(--white);
      border-radius: var(--radius-lg);
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow: auto;
      animation: fadeInScale 0.3s ease;
      box-shadow: var(--shadow-xl);
    `;

    modal.innerHTML = `
      ${showClose ? `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--light-gray);">
          <h3 style="font-size: 1.125rem; font-weight: 600; color: var(--text-primary);">${Validators.sanitize(title)}</h3>
          <button class="modal-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); line-height: 1;">&times;</button>
        </div>
      ` : ''}
      <div style="padding: 20px;">${content}</div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Close handlers
    const close = () => {
      overlay.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        if (onClose) onClose();
      }, 300);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', close);

    return { overlay, modal, close };
  }
};

// ============================================
// LOADING OVERLAY
// ============================================
const Loading = {
  overlay: null,

  /**
   * Show full-screen loading overlay
   * @param {string} message - Loading message
   */
  show(message = 'Loading...') {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(255,255,255,0.95);
      z-index: 500;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    `;

    this.overlay.innerHTML = `
      <div class="spinner spinner-lg"></div>
      <p style="color: var(--text-secondary); font-size: 1rem; font-weight: 500;">${Validators.sanitize(message)}</p>
    `;

    document.body.appendChild(this.overlay);
  },

  /**
   * Hide loading overlay
   */
  hide() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
};

// ============================================
// DARK MODE TOGGLE
// ============================================
const DarkMode = {
  STORAGE_KEY: 'muralidhar_dark_mode',

  /**
   * Initialize dark mode based on saved preference
   */
  init() {
    const isDark = Storage.get(this.STORAGE_KEY);
    if (isDark) {
      document.body.classList.add('dark-mode');
    }
  },

  /**
   * Toggle dark mode
   */
  toggle() {
    const isDark = document.body.classList.toggle('dark-mode');
    Storage.set(this.STORAGE_KEY, isDark);
    return isDark;
  },

  /**
   * Check if dark mode is active
   */
  isActive() {
    return document.body.classList.contains('dark-mode');
  }
};

// ============================================
// DEBOUNCE & THROTTLE
// ============================================
const Utils = {
  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Limit in ms
   */
  throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Generate unique ID
   */
  generateId() {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Toast.success('Copied to clipboard!');
    } catch (err) {
      Toast.error('Failed to copy');
    }
  }
};

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  DarkMode.init();
  Toast.init();
});

// Export for module usage (if using modules)
// For vanilla JS, these are available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, Storage, API, URLUtils, Formatters, Validators, CartManager, Toast, Modal, Loading, DarkMode, Utils };
}
