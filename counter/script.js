/**
 * ============================================
 * MURALIDHAR RESTAURANT - COUNTER PANEL
 * ============================================
 * Displays all active (unpaid) table bills, lets counter
 * staff view the merged bill, mark it paid, or delete it.
 * Relies on shared utils.js for CONFIG, Toast, Formatters.
 * Talks to its own dedicated endpoints (NOT /api/*):
 *   GET    /counter/orders
 *   POST   /counter/payment
 *   DELETE /counter/order/:id
 */

(() => {
  // Counter endpoints are served directly (not under /api), so we
  // build a root URL the same way shared CONFIG builds SOCKET_URL.
  const COUNTER_ROOT = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '';

  const els = {
    grid: document.getElementById('ordersGrid'),
    empty: document.getElementById('emptyState'),
    template: document.getElementById('billCardTemplate'),
    connectionBadge: document.getElementById('connectionBadge'),
    clock: document.getElementById('liveClock'),
    statActiveBills: document.getElementById('statActiveBills'),
    statRevenue: document.getElementById('statRevenue'),
    refreshBtn: document.getElementById('refreshBtn'),
    modalOverlay: document.getElementById('billModalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalCloseBtn: document.getElementById('modalCloseBtn')
  };

  // In-memory bill cache: billId -> bill object
  let billsById = new Map();
  let newlyArrivedIds = new Set();

  // ============================================
  // COUNTER API HELPER (dedicated, non-/api routes)
  // ============================================
  const CounterAPI = {
    async request(path, options = {}) {
      const url = `${COUNTER_ROOT}${path}`;
      const defaultOptions = {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'same-origin'
      };
      const merged = {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
      };
      const res = await fetch(url, merged);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    getOrders() {
      return this.request('/counter/orders', { method: 'GET' });
    },
    pay(billId, payment_method) {
      return this.request('/counter/payment', {
        method: 'POST',
        body: JSON.stringify({ billId, payment_method })
      });
    },
    deleteOrder(billId) {
      return this.request(`/counter/order/${billId}`, { method: 'DELETE' });
    }
  };

  // ============================================
  // CONNECTION STATUS
  // ============================================
  function setConnectionStatus(online) {
    els.connectionBadge.classList.toggle('online', online);
    els.connectionBadge.classList.toggle('offline', !online);
    els.connectionBadge.innerHTML = online
      ? '<span class="dot"></span> Live'
      : '<span class="dot"></span> Reconnecting...';
  }

  // ============================================
  // LIVE CLOCK
  // ============================================
  function tickClock() {
    els.clock.textContent = new Date().toLocaleTimeString('en-IN', { hour12: false });
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ============================================
  // FETCH ACTIVE BILLS
  // ============================================
  async function fetchBills({ silent = false } = {}) {
    if (!silent) els.refreshBtn.classList.add('spinning');
    try {
      const res = await CounterAPI.getOrders();
      const bills = res.data || [];

      const previousIds = new Set(billsById.keys());
      const freshIds = [];
      bills.forEach(b => {
        if (!previousIds.has(b.billId)) freshIds.push(b.billId);
      });

      billsById = new Map(bills.map(b => [b.billId, b]));

      if (freshIds.length && previousIds.size > 0) {
        freshIds.forEach(id => newlyArrivedIds.add(id));
      }

      renderBills();
      setConnectionStatus(true);
    } catch (err) {
      console.error('Failed to fetch active orders:', err);
      setConnectionStatus(false);
      if (!silent) Toast.error('Could not load orders. Retrying...');
    } finally {
      setTimeout(() => els.refreshBtn.classList.remove('spinning'), 400);
    }
  }

  // ============================================
  // RENDER
  // ============================================
  function renderBills() {
    const bills = Array.from(billsById.values()).sort(
      (a, b) => new Date(a.orderTime) - new Date(b.orderTime)
    );

    els.grid.innerHTML = '';
    els.empty.classList.toggle('hidden', bills.length > 0);

    let openValue = 0;
    bills.forEach(bill => {
      openValue += Number(bill.grandTotal) || 0;
      els.grid.appendChild(buildBillCard(bill));
    });

    els.statActiveBills.textContent = bills.length;
    els.statRevenue.textContent = Formatters.price(openValue);
  }

  function buildBillCard(bill) {
    const node = els.template.content.cloneNode(true);
    const card = node.querySelector('.bill-card');

    card.classList.add(`status-${bill.status}`);
    if (newlyArrivedIds.has(bill.billId)) {
      card.classList.add('new-flash');
      newlyArrivedIds.delete(bill.billId);
    }
    card.dataset.billId = bill.billId;

    node.querySelector('.bill-table').textContent = `Table ${bill.tableNumber}`;
    node.querySelector('.bill-number').textContent = bill.billNumber;

    const badge = node.querySelector('.status-badge');
    badge.textContent = statusLabel(bill.status);
    badge.classList.add(bill.status);

    node.querySelector('.bill-name').textContent = bill.customerName || '—';
    node.querySelector('.bill-phone').textContent = Formatters.phone(bill.customerPhone);
    node.querySelector('.bill-time').textContent = Formatters.datetime(bill.orderTime);
    node.querySelector('.bill-payment-status').textContent = bill.paymentStatus === 'unpaid' ? 'Unpaid' : (bill.paymentStatus || 'Unpaid');

    const itemsList = node.querySelector('.bill-items');
    (bill.items || []).forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="item-name">${escapeHtml(item.name)}</span>
        <span class="item-qty">x${item.quantity}</span>
        <span class="item-price">${Formatters.price(item.unitPrice)}</span>
        <span class="item-total">${Formatters.price(item.totalPrice)}</span>
      `;
      itemsList.appendChild(li);
    });

    node.querySelector('.val-subtotal').textContent = Formatters.price(bill.subtotal);
    node.querySelector('.val-gst').textContent = Formatters.price(bill.gst);
    node.querySelector('.val-grand').textContent = Formatters.price(bill.grandTotal);

    node.querySelector('.view-btn').addEventListener('click', () => openViewBillModal(bill));
    node.querySelector('.pay-btn').addEventListener('click', () => openPaymentModal(bill));
    node.querySelector('.delete-btn').addEventListener('click', () => confirmDeleteOrder(bill));

    return card;
  }

  function statusLabel(status) {
    const labels = {
      pending: 'Pending',
      preparing: 'Preparing',
      ready: 'Ready',
      mixed: 'In Progress',
      completed: 'Completed'
    };
    return labels[status] || status;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  // ============================================
  // VIEW BILL MODAL
  // ============================================
  function openModal(title, bodyHtml) {
    els.modalTitle.textContent = title;
    els.modalBody.innerHTML = bodyHtml;
    els.modalOverlay.classList.remove('hidden');
  }

  function closeModal() {
    els.modalOverlay.classList.add('hidden');
    els.modalBody.innerHTML = '';
  }

  els.modalCloseBtn.addEventListener('click', closeModal);
  els.modalOverlay.addEventListener('click', (e) => {
    if (e.target === els.modalOverlay) closeModal();
  });

  function openViewBillModal(bill) {
    const itemRows = (bill.items || []).map(item => `
      <div class="modal-row">
        <span>${escapeHtml(item.name)} x${item.quantity}</span>
        <span>${Formatters.price(item.totalPrice)}</span>
      </div>
    `).join('');

    const orderRows = (bill.orders || []).map(o => `
      <div class="modal-row">
        <span>${escapeHtml(o.orderNumber)}</span>
        <span>${statusLabel(o.status)}</span>
      </div>
    `).join('');

    const body = `
      <div class="modal-row"><span>Table</span><span>${escapeHtml(bill.tableNumber)}</span></div>
      <div class="modal-row"><span>Name</span><span>${escapeHtml(bill.customerName || '—')}</span></div>
      <div class="modal-row"><span>Mobile</span><span>${Formatters.phone(bill.customerPhone)}</span></div>
      <div class="modal-row"><span>Order Time</span><span>${Formatters.datetime(bill.orderTime)}</span></div>
      <div class="modal-row"><span>Payment Status</span><span>${escapeHtml(bill.paymentStatus === 'unpaid' ? 'Unpaid' : (bill.paymentStatus || 'Unpaid'))}</span></div>

      <div class="modal-row section-title">Merged Orders</div>
      ${orderRows || '<div class="modal-row"><span>No orders</span></div>'}

      <div class="modal-row section-title">Items</div>
      ${itemRows || '<div class="modal-row"><span>No items</span></div>'}

      <div class="modal-row section-title">Bill Summary</div>
      <div class="modal-row"><span>Subtotal</span><span>${Formatters.price(bill.subtotal)}</span></div>
      <div class="modal-row"><span>GST</span><span>${Formatters.price(bill.gst)}</span></div>
      <div class="modal-row grand"><span>Grand Total</span><span>${Formatters.price(bill.grandTotal)}</span></div>
    `;

    openModal(`Bill ${bill.billNumber}`, body);
  }

  // ============================================
  // MARK AS PAID
  // ============================================
  function openPaymentModal(bill) {
    const methods = [
      { key: 'cash', label: '💵 Cash' },
      { key: 'card', label: '💳 Card' },
      { key: 'upi', label: '📲 UPI' },
      { key: 'wallet', label: '👛 Wallet' }
    ];

    const buttonsHtml = methods.map(m => `
      <button class="action-btn pay-method-btn" data-method="${m.key}" style="background: var(--secondary-green); margin-bottom: 8px;">
        ${m.label}
      </button>
    `).join('');

    const body = `
      <div class="modal-row"><span>Table</span><span>${escapeHtml(bill.tableNumber)}</span></div>
      <div class="modal-row grand"><span>Amount Due</span><span>${Formatters.price(bill.grandTotal)}</span></div>
      <p style="margin: var(--space-md) 0 var(--space-sm); color: var(--text-secondary); font-size: 0.85rem;">
        Select payment method to confirm:
      </p>
      <div class="flex-col gap-sm">${buttonsHtml}</div>
    `;

    openModal(`Mark as Paid — ${bill.billNumber}`, body);

    els.modalBody.querySelectorAll('.pay-method-btn').forEach(btn => {
      btn.addEventListener('click', () => handleMarkPaid(bill, btn.dataset.method, btn));
    });
  }

  async function handleMarkPaid(bill, method, btnEl) {
    els.modalBody.querySelectorAll('.pay-method-btn').forEach(b => b.disabled = true);
    if (btnEl) btnEl.textContent = 'Processing...';
    try {
      await CounterAPI.pay(bill.billId, method);
      Toast.success(`Payment recorded for Table ${bill.tableNumber}. Table freed.`);
      billsById.delete(bill.billId);
      renderBills();
      closeModal();
    } catch (err) {
      console.error('Payment failed:', err);
      Toast.error(err.message || 'Failed to record payment');
      els.modalBody.querySelectorAll('.pay-method-btn').forEach(b => b.disabled = false);
    }
  }

  // ============================================
  // DELETE ORDER
  // ============================================
  function confirmDeleteOrder(bill) {
    const body = `
      <p style="margin-bottom: var(--space-md);">
        This will permanently delete <strong>${escapeHtml(bill.billNumber)}</strong> for
        <strong>Table ${escapeHtml(bill.tableNumber)}</strong> and free the table. This cannot be undone.
      </p>
      <div class="flex gap-sm">
        <button class="action-btn" id="cancelDeleteBtn" style="background: var(--dark-gray);">Cancel</button>
        <button class="action-btn delete-btn" id="confirmDeleteBtn">Delete Order</button>
      </div>
    `;
    openModal('Delete Order?', body);

    document.getElementById('cancelDeleteBtn').addEventListener('click', closeModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => handleDeleteOrder(bill));
  }

  async function handleDeleteOrder(bill) {
    try {
      await CounterAPI.deleteOrder(bill.billId);
      Toast.success(`Order for Table ${bill.tableNumber} deleted. Table freed.`);
      billsById.delete(bill.billId);
      renderBills();
      closeModal();
    } catch (err) {
      console.error('Delete failed:', err);
      Toast.error(err.message || 'Failed to delete order');
    }
  }

  // ============================================
  // SOCKET.IO REAL-TIME
  // ============================================
  function initSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO client not available, falling back to polling only.');
      setConnectionStatus(false);
      return;
    }

    const socket = io(CONFIG.SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socket.on('connect', () => {
      socket.emit('join_room', 'counter');
      setConnectionStatus(true);
      fetchBills({ silent: true });
    });

    socket.on('disconnect', () => setConnectionStatus(false));
    socket.on('connect_error', () => setConnectionStatus(false));

    // New order placed by a customer (auto-shows on counter, merges into bill)
    socket.on('bill_update', () => fetchBills({ silent: true }));
    socket.on('new_order', () => fetchBills({ silent: true }));

    // Kitchen status changes affect the badge shown on the counter card
    socket.on('order_status_update', () => fetchBills({ silent: true }));

    // Payment / closure events (may originate from this or another counter screen)
    socket.on('payment_received', () => fetchBills({ silent: true }));
    socket.on('bill_paid', () => fetchBills({ silent: true }));
    socket.on('bill_closed', () => fetchBills({ silent: true }));
    socket.on('order_deleted', () => fetchBills({ silent: true }));
  }

  // ============================================
  // INIT
  // ============================================
  els.refreshBtn.addEventListener('click', () => fetchBills());

  fetchBills();
  initSocket();

  // Resilience: poll every 15s regardless of socket state
  setInterval(() => fetchBills({ silent: true }), 15000);
})();
