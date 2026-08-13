/**
 * ============================================
 * MURALIDHAR RESTAURANT - CART MODULE
 * ============================================
 * Handles cart display, quantity updates, bill summary,
 * special instructions, and order placement flow.
 */

// ============================================
// DOM ELEMENTS
// ============================================
const CartDOM = {
  cartItems: null,
  emptyCart: null,
  cartItemCount: null,
  billSummary: null,
  subtotal: null,
  gst: null,
  grandTotal: null,
  specialInstructions: null,
  placeOrderBtn: null
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM elements
  CartDOM.cartItems = document.getElementById('cartItems');
  CartDOM.emptyCart = document.getElementById('emptyCart');
  CartDOM.cartItemCount = document.getElementById('cartItemCount');
  CartDOM.billSummary = document.getElementById('billSummary');
  CartDOM.subtotal = document.getElementById('subtotal');
  CartDOM.gst = document.getElementById('gst');
  CartDOM.grandTotal = document.getElementById('grandTotal');
  CartDOM.specialInstructions = document.getElementById('specialInstructions');
  CartDOM.placeOrderBtn = document.getElementById('placeOrderBtn');

  // Validate table
  validateTableAccess();

  // Load the current shared Neon menu first, then reconcile the cart.
  await MenuService.refresh(false);
  reconcileCartWithMenu({ allowRemoval: MenuService.wasLastRefreshSuccessful() });

  // Render cart
  renderCart();

  MenuService.subscribe(() => {
    reconcileCartWithMenu({ allowRemoval: MenuService.wasLastRefreshSuccessful() });
    renderCart();
  });
});



// Reconcile and repaint when the browser restores this page from history.
window.addEventListener('pageshow', () => {
  if (!CartDOM.cartItems) return;
  reconcileCartWithMenu({ allowRemoval: false });
  renderCart();
});

/**
 * Synchronize cart snapshots with the current visible menu.
 * Hidden/deleted dishes are removed and edited prices/names are refreshed.
 */
function reconcileCartWithMenu({ allowRemoval = false } = {}) {
  const visibleMenu = MenuService.getVisibleMenu();
  const menuById = new Map(visibleMenu.map(item => [item.id, item]));

  // Never wipe a valid cart merely because Render/Neon is waking up, a request is rate-limited,
  // or the phone briefly loses connectivity. Update snapshots when current data exists.
  const reconciled = CartManager.getItems()
    .filter(cartItem => !allowRemoval || menuById.has(cartItem.id))
    .map(cartItem => {
      const current = menuById.get(cartItem.id);
      if (!current) return cartItem;
      return {
        ...cartItem,
        name: current.name,
        description: current.description,
        price: current.price,
        image: current.image,
        category: current.category,
        categoryId: current.categoryId,
        isVeg: current.isVeg,
        isBestSeller: current.isBestSeller,
        preparationTime: current.preparationTime
      };
    });
  CartManager.saveCart(reconciled);
}

// ============================================
// TABLE VALIDATION
// ============================================

function validateTableAccess() {
  const table = URLUtils.getTableNumber();

  if (!table || !Validators.isValidTable(table)) {
    Toast.error('Invalid table access. Redirecting...');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return false;
  }

  // Cart/session storage is table-scoped, so opening Table 1 and Table 2
  // in separate tabs can no longer leak dishes into each other.
  Storage.set('muralidhar_table', table);
  CartManager.cleanupLegacyStorage();

  return true;
}

// ============================================
// RENDER CART
// ============================================

function renderCart() {
  const cart = CartManager.getItems();
  const totals = CartManager.getTotals();

  // Update item count text
  CartDOM.cartItemCount.textContent = `${totals.itemCount} item${totals.itemCount !== 1 ? 's' : ''}`;

  // Handle empty cart
  if (cart.length === 0) {
    showEmptyCart();
    return;
  }

  // Show cart items
  CartDOM.emptyCart.classList.add('hidden');
  CartDOM.cartItems.classList.remove('hidden');
  CartDOM.billSummary.classList.remove('hidden');

  // Render items
  CartDOM.cartItems.innerHTML = cart.map((item, index) => createCartItemHTML(item, index)).join('');

  // Update bill summary
  updateBillSummary(totals);

  // Attach event listeners
  attachCartListeners();
}

// ============================================
// EMPTY CART STATE
// ============================================

function showEmptyCart() {
  CartDOM.cartItems.classList.add('hidden');
  CartDOM.emptyCart.classList.remove('hidden');
  CartDOM.billSummary.classList.add('hidden');
  CartDOM.placeOrderBtn.disabled = true;
}

// ============================================
// CART ITEM TEMPLATE
// ============================================

function createCartItemHTML(item, index) {
  const itemTotal = item.price * item.quantity;
  const imageUrl = item.image || generateCartPlaceholder(item.name);

  return `
    <div class="cart-item" data-item-id="${item.id}" style="animation-delay: ${index * 0.05}s">
      <img 
        src="${imageUrl}" 
        alt="${item.name}" 
        class="cart-item-image"
        onerror="this.src='${generateCartPlaceholder(item.name)}'"
      >
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${Formatters.price(item.price)} each</div>
      </div>
      <div class="cart-item-actions">
        <div class="cart-item-total">${Formatters.price(itemTotal)}</div>
        <div class="quantity-control" data-item-id="${item.id}">
          <button class="qty-btn minus" data-action="decrease" data-item-id="${item.id}" aria-label="Decrease quantity">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn plus" data-action="increase" data-item-id="${item.id}" aria-label="Increase quantity">+</button>
        </div>
        <button class="remove-btn" data-action="remove" data-item-id="${item.id}">Remove</button>
      </div>
    </div>
  `;
}

// ============================================
// PLACEHOLDER GENERATOR
// ============================================

function generateCartPlaceholder(name) {
  const colors = {
    'Cha': '#8B4513',
    'Poha': '#F4A460',
    'Roti': '#D2691E'
  };

  const bgColor = colors[name] || '#FF6B00';
  const firstLetter = name.charAt(0);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" fill="${bgColor}" rx="8"/>
      <text x="40" y="48" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">${firstLetter}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ============================================
// BILL SUMMARY
// ============================================

function updateBillSummary(totals) {
  CartDOM.subtotal.textContent = Formatters.price(totals.subtotal);
  CartDOM.gst.textContent = Formatters.price(totals.gst);
  CartDOM.grandTotal.textContent = Formatters.price(totals.grandTotal);
}

// ============================================
// EVENT LISTENERS
// ============================================

function attachCartListeners() {
  CartDOM.cartItems.addEventListener('click', handleCartAction);
}

function handleCartAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const itemId = parseInt(btn.dataset.itemId);
  const action = btn.dataset.action;

  switch (action) {
    case 'increase':
      handleIncrease(itemId);
      break;
    case 'decrease':
      handleDecrease(itemId);
      break;
    case 'remove':
      handleRemove(itemId);
      break;
  }
}

function handleIncrease(itemId) {
  const cart = CartManager.getItems();
  const item = cart.find(i => i.id === itemId);

  if (item) {
    CartManager.updateQuantity(itemId, item.quantity + 1);
    renderCart();
    Toast.success('Quantity increased');
  }
}

function handleDecrease(itemId) {
  const cart = CartManager.getItems();
  const item = cart.find(i => i.id === itemId);

  if (!item) return;

  if (item.quantity <= 1) {
    // Confirm removal
    if (confirm('Remove this item from cart?')) {
      CartManager.removeItem(itemId);
      Toast.info('Item removed');
    }
  } else {
    CartManager.updateQuantity(itemId, item.quantity - 1);
  }

  renderCart();
}

function handleRemove(itemId) {
  const cart = CartManager.getItems();
  const item = cart.find(i => i.id === itemId);

  if (item && confirm(`Remove ${item.name} from cart?`)) {
    CartManager.removeItem(itemId);
    Toast.info(`${item.name} removed from cart`);
    renderCart();
  }
}

// ============================================
// NAVIGATION
// ============================================

function goBack() {
  const table = URLUtils.getTableNumber();
  window.location.href = `menu.html?table=${table}`;
}

// ============================================
// ORDER PLACEMENT FLOW (NO OTP)
// ============================================

/** Ask for customer name and mobile number, then place the order directly. */
function initiateOrder() {
  const cart = CartManager.getItems();
  if (cart.length === 0) {
    Toast.error('Your cart is empty!');
    return;
  }
  showCustomerDetailsModal();
}

function showCustomerDetailsModal() {
  Modal.show({
    title: 'Customer Details',
    content: `
      <form class="phone-modal-content" id="customerDetailsForm" novalidate>
        <div class="icon">👤</div>
        <h3>Enter your details</h3>
        <p>No OTP required. Enter your name and mobile number to place the order.</p>
        <div class="phone-input-wrapper" style="margin-bottom: 12px;">
          <input
            type="text"
            class="phone-input"
            id="customerNameInput"
            placeholder="Your name"
            maxlength="60"
            autocomplete="name"
            style="padding-left: 18px;"
          >
        </div>
        <div class="phone-error" id="nameError">Please enter your name</div>
        <div class="phone-input-wrapper" id="phoneInputWrapper">
          <span class="phone-prefix">+91</span>
          <input
            type="tel"
            class="phone-input"
            id="phoneInput"
            placeholder="9876543210"
            maxlength="10"
            inputmode="numeric"
            autocomplete="tel"
          >
        </div>
        <div class="phone-error" id="phoneError">Please enter a valid 10-digit mobile number</div>
        <button type="button" class="send-otp-btn" id="directPlaceOrderBtn">
          Place Order
        </button>
      </form>
    `,
    showClose: true
  });

  const form = document.getElementById('customerDetailsForm');
  const nameInput = document.getElementById('customerNameInput');
  const phoneInput = document.getElementById('phoneInput');
  const nameError = document.getElementById('nameError');
  const phoneError = document.getElementById('phoneError');
  const directPlaceOrderBtn = document.getElementById('directPlaceOrderBtn');

  // Keep the customer details for repeat orders on the same table.
  // This does NOT close/reset the table; the server keeps the running bill open
  // until the Counter marks it paid/completed.
  const table = URLUtils.getTableNumber();
  const savedCustomer = Storage.get(`muralidhar_customer_${table}`);
  if (savedCustomer) {
    nameInput.value = savedCustomer.name || '';
    phoneInput.value = savedCustomer.phone || '';
  }

  nameInput.addEventListener('input', () => nameError.classList.remove('visible'));
  phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    phoneError.classList.remove('visible');
  });

  // IMPORTANT: only the orange Place Order button may place an order.
  // Mobile keyboards often send Enter/Go/Arrow as a form submit. Prevent that
  // so the keyboard action can never create an order accidentally.
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  });

  [nameInput, phoneInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        // The keyboard action NEVER places an order. It may only advance focus.
        if (input === nameInput) phoneInput.focus();
      }
    }, true);
  });

  // Android browsers sometimes treat the first tap while the numeric keyboard is open
  // as a blur/dismiss-keyboard gesture. Listen on pointerdown so the visible orange
  // button executes BEFORE the input loses focus. A short lock prevents the later
  // synthetic click from creating a duplicate order.
  let buttonGestureHandled = false;
  const submitFromVisibleButton = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (buttonGestureHandled) return;
    buttonGestureHandled = true;
    handleCustomerDetailsSubmit();
    setTimeout(() => { buttonGestureHandled = false; }, 1200);
  };

  if (directPlaceOrderBtn) {
    if (window.PointerEvent) {
      directPlaceOrderBtn.addEventListener('pointerdown', submitFromVisibleButton, { passive: false });
    } else {
      directPlaceOrderBtn.addEventListener('touchstart', submitFromVisibleButton, { passive: false });
      directPlaceOrderBtn.addEventListener('mousedown', submitFromVisibleButton);
    }
    // Keyboard activation of the button itself (accessibility) still works, but input
    // Enter/Go/Arrow cannot submit the order.
    directPlaceOrderBtn.addEventListener('click', (e) => {
      if (buttonGestureHandled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      submitFromVisibleButton(e);
    });
  }

  setTimeout(() => (nameInput.value ? phoneInput : nameInput).focus(), 100);
}

function handleCustomerDetailsSubmit() {
  const nameInput = document.getElementById('customerNameInput');
  const phoneInput = document.getElementById('phoneInput');
  const nameError = document.getElementById('nameError');
  const phoneError = document.getElementById('phoneError');
  const button = document.getElementById('directPlaceOrderBtn');

  const name = (nameInput?.value || '').trim().replace(/\s+/g, ' ');
  const phone = (phoneInput?.value || '').trim();
  let valid = true;

  if (name.length < 2) {
    nameError?.classList.add('visible');
    valid = false;
  }
  if (!Validators.isValidPhone(phone)) {
    phoneError?.classList.add('visible');
    valid = false;
  }
  if (!valid) return;

  if (button) {
    button.disabled = true;
    button.textContent = 'Placing Order...';
  }
  placeOrder(name, phone);
}

// ============================================
// PLACE ORDER
// ============================================

function placeOrder(customerName, phone) {
  const table = URLUtils.getTableNumber();
  const cart = CartManager.getItems();
  const totals = CartManager.getTotals();
  const instructions = CartDOM.specialInstructions.value.trim();
  const sessionId = CartManager.getSessionId();

  Loading.show('Placing your order...');

  const orderData = {
    table_number: parseInt(table),
    customer_name: customerName,
    customer_phone: phone,
    items: cart.map(item => ({
      menu_item_id: item.id,
      name: item.name,
      category: item.category || item.categoryId || 'other',
      description: item.description || '',
      image: item.image || '',
      is_veg: item.isVeg !== false,
      is_best_seller: Boolean(item.isBestSeller),
      preparation_time: Number(item.preparationTime) || 10,
      quantity: item.quantity,
      price: item.price
    })),
    subtotal: totals.subtotal,
    gst: totals.gst,
    grand_total: totals.grandTotal,
    special_instructions: instructions,
    session_id: sessionId
  };

  API.request('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  })
    .then((res) => {
      Loading.hide();
      if (!res || !res.success) throw new Error((res && res.message) || 'Failed to place order');

      const orderNumber = res.data.orderNumber;
      Storage.set('muralidhar_last_order', {
        orderNumber,
        table,
        name: customerName,
        phone,
        timestamp: Date.now(),
        total: totals.grandTotal
      });
      Storage.set(`muralidhar_customer_${table}`, { name: customerName, phone });

      // Clear only the cart after an order. Keep the table session alive so a
      // Continue Order is appended to the same running table bill. The table is
      // reset on the server only when Counter completes/payment-closes the bill.
      CartManager.clear();
      if (CartDOM.specialInstructions) CartDOM.specialInstructions.value = '';
      window.location.replace(`success.html?table=${table}&order=${encodeURIComponent(orderNumber)}`);
    })
    .catch((err) => {
      Loading.hide();
      console.error('Failed to place order:', err);
      Toast.error(err.message || 'Failed to place order. Please try again.');
      const button = document.getElementById('directPlaceOrderBtn');
      if (button) {
        button.disabled = false;
        button.textContent = 'Place Order';
      }
    });
}

// ============================================
// OFFLINE HANDLING
// ============================================

window.addEventListener('offline', () => {
  Toast.warning('You are offline. Order placement may fail.');
});
