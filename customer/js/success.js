/**
 * ============================================
 * MURALIDHAR RESTAURANT - ORDER SUCCESS MODULE
 * ============================================
 * Populates order confirmation details and handles
 * the "Continue Ordering" action.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderOrderDetails();
});

/**
 * Render order details on the success page.
 * Prefers the order saved in Storage (set right before redirecting
 * here from the cart page); falls back to URL params if missing.
 */
function renderOrderDetails() {
  const tableFromUrl = URLUtils.getParam('table');
  const orderFromUrl = URLUtils.getParam('order');

  const savedOrder = Storage.get('muralidhar_last_order');

  const orderNumber = (savedOrder && savedOrder.orderNumber) || orderFromUrl || '----';
  const table = (savedOrder && savedOrder.table) || tableFromUrl || '--';
  const phone = savedOrder && savedOrder.phone;
  const timestamp = savedOrder && savedOrder.timestamp;
  const total = savedOrder && savedOrder.total;

  const orderNumberEl = document.getElementById('orderNumber');
  const tableNumberEl = document.getElementById('tableNumber');
  const customerPhoneEl = document.getElementById('customerPhone');
  const orderTimeEl = document.getElementById('orderTime');
  const orderTotalEl = document.getElementById('orderTotal');

  if (orderNumberEl) orderNumberEl.textContent = Formatters.orderNumber(orderNumber);
  if (tableNumberEl) tableNumberEl.textContent = table;
  if (customerPhoneEl && phone) customerPhoneEl.textContent = Formatters.phone(phone);
  if (orderTimeEl && timestamp) orderTimeEl.textContent = Formatters.datetime(timestamp);
  if (orderTotalEl && total !== undefined) orderTotalEl.textContent = Formatters.price(total);
}

/**
 * Continue Ordering button handler.
 * Sends the customer back to the menu for the same table
 * so they can add more items to a fresh order.
 */
window.continueOrdering = function () {
  const table = URLUtils.getParam('table') || Storage.get('muralidhar_table') || 1;

  // Wipe the previous order's info now that we're starting a new one.
  Storage.remove('muralidhar_last_order');

  window.location.href = `menu.html?table=${table}`;
};
