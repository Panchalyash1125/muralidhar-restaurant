/**
 * ============================================
 * MURALIDHAR RESTAURANT - KITCHEN DISPLAY SYSTEM
 * ============================================
 * Real-time order queue for kitchen staff.
 * Relies on shared utils.js for CONFIG, API, Formatters.
 */

(() => {
  const SOUND_KEY = 'muralidhar_kitchen_sound';

  const els = {
    grid: document.getElementById('ordersGrid'),
    empty: document.getElementById('emptyState'),
    template: document.getElementById('orderCardTemplate'),
    connectionBadge: document.getElementById('connectionBadge'),
    clock: document.getElementById('liveClock'),
    statPending: document.getElementById('statPending'),
    statPreparing: document.getElementById('statPreparing'),
    statReady: document.getElementById('statReady'),
    soundToggle: document.getElementById('soundToggle'),
    refreshBtn: document.getElementById('refreshBtn')
  };

  // In-memory order cache: id -> order object
  let ordersById = new Map();
  let newlyArrivedIds = new Set();
  let soundEnabled = Storage.get(SOUND_KEY);
  if (soundEnabled === null) soundEnabled = true;

  // ============================================
  // SOUND ALERT (Web Audio beep, no external asset)
  // ============================================
  let audioCtx = null;
  function ensureAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  function playNewOrderChime() {
    if (!soundEnabled) return;
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1108].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.32);
    });
  }

  function updateSoundButton() {
    els.soundToggle.textContent = soundEnabled ? '🔔' : '🔕';
    els.soundToggle.classList.toggle('muted', !soundEnabled);
  }
  updateSoundButton();

  els.soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    Storage.set(SOUND_KEY, soundEnabled);
    updateSoundButton();
    // Unlock audio context on user gesture
    ensureAudioCtx();
    if (soundEnabled) playNewOrderChime();
  });

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
  // ELAPSED TIME HELPERS
  // ============================================
  function elapsedLabel(createdAt) {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const totalSec = Math.max(0, Math.floor(diffMs / 1000));
    const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const ss = (totalSec % 60).toString().padStart(2, '0');
    return { text: `${mm}:${ss}`, minutes: totalSec / 60 };
  }

  function urgencyClass(minutes) {
    if (minutes >= 20) return 'urgent';
    if (minutes >= 10) return 'warn';
    return '';
  }

  // ============================================
  // FETCH ORDERS
  // ============================================
  async function fetchOrders({ silent = false } = {}) {
    if (!silent) els.refreshBtn.classList.add('spinning');
    try {
      const res = await API.get('/orders/active');
      const orders = res.data || [];

      // Detect brand-new orders (present now, absent before) for chime/flash
      const previousIds = new Set(ordersById.keys());
      const freshIds = [];
      orders.forEach(o => {
        if (!previousIds.has(o.id)) freshIds.push(o.id);
      });

      ordersById = new Map(orders.map(o => [o.id, o]));

      if (freshIds.length && previousIds.size > 0) {
        // Only chime if this isn't the very first load
        freshIds.forEach(id => newlyArrivedIds.add(id));
        playNewOrderChime();
      }

      renderOrders();
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
  function renderOrders() {
    const orders = Array.from(ordersById.values()).sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    els.grid.innerHTML = '';
    els.empty.classList.toggle('hidden', orders.length > 0);

    let counts = { pending: 0, preparing: 0, ready: 0 };

    orders.forEach(order => {
      if (order.status === 'pending' || order.status === 'accepted') counts.pending++;
      else if (order.status === 'preparing') counts.preparing++;
      else if (order.status === 'ready') counts.ready++;

      els.grid.appendChild(buildOrderCard(order));
    });

    els.statPending.textContent = counts.pending;
    els.statPreparing.textContent = counts.preparing;
    els.statReady.textContent = counts.ready;
  }

  function buildOrderCard(order) {
    const node = els.template.content.cloneNode(true);
    const card = node.querySelector('.order-card');
    const { text: elapsedText, minutes } = elapsedLabel(order.created_at);
    const urgency = urgencyClass(minutes);

    const statusKey = order.status === 'accepted' ? 'pending' : order.status;
    card.classList.add(`status-${statusKey}`);
    if (urgency === 'warn') card.classList.add('warn-time');
    if (urgency === 'urgent') card.classList.add('urgent-time');
    if (newlyArrivedIds.has(order.id)) {
      card.classList.add('new-flash');
      newlyArrivedIds.delete(order.id);
    }
    card.dataset.orderId = order.id;

    node.querySelector('.order-number').textContent = `#${order.order_number}`;
    node.querySelector('.order-table').textContent = order.table_number
      ? `Table ${order.table_number}`
      : '';

    const timerEl = node.querySelector('.order-timer');
    timerEl.textContent = elapsedText;
    if (urgency) timerEl.classList.add(urgency);

    node.querySelector('.order-phone').textContent = Formatters.phone(order.customer_phone);
    node.querySelector('.order-time').textContent = Formatters.time(order.created_at);

    const itemsList = node.querySelector('.order-items');
    let items = [];
    try {
      items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
    } catch (e) {
      items = [];
    }
    items.forEach(item => {
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'item-name';
      nameSpan.textContent = item.name || 'Item';
      const qtySpan = document.createElement('span');
      qtySpan.className = 'item-qty';
      qtySpan.textContent = `x${item.quantity}`;
      li.appendChild(nameSpan);
      li.appendChild(qtySpan);
      itemsList.appendChild(li);
    });

    node.querySelector('.total-value').textContent = Formatters.price(order.grand_total);

    const badge = node.querySelector('.status-badge');
    badge.textContent = statusKey;
    badge.classList.add(statusKey);

    const actions = node.querySelector('.order-actions');
    actions.appendChild(buildActionButton(order));

    return card;
  }

  function buildActionButton(order) {
    const btn = document.createElement('button');
    btn.className = 'action-btn';

    const flow = {
      pending: { next: 'preparing', label: '▶ Start Preparing', cls: 'to-preparing' },
      accepted: { next: 'preparing', label: '▶ Start Preparing', cls: 'to-preparing' },
      preparing: { next: 'ready', label: '✓ Mark Ready', cls: 'to-ready' },
      ready: { next: 'completed', label: '✔ Complete & Serve', cls: 'to-complete' }
    };

    const step = flow[order.status];
    if (!step) {
      btn.textContent = 'No action';
      btn.disabled = true;
      return btn;
    }

    btn.classList.add(step.cls);
    btn.textContent = step.label;
    btn.addEventListener('click', () => handleStatusChange(order.id, step.next, btn));
    return btn;
  }

  async function handleStatusChange(orderId, nextStatus, btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'Updating...';
    try {
      await API.put(`/orders/${orderId}/status`, { status: nextStatus });
      Toast.success(
        nextStatus === 'completed' ? 'Order served!' : `Order marked ${nextStatus}`
      );
      // Optimistically update local cache, then re-render
      const cached = ordersById.get(orderId);
      if (cached) {
        if (nextStatus === 'completed') {
          ordersById.delete(orderId);
        } else {
          cached.status = nextStatus;
        }
      }
      renderOrders();
    } catch (err) {
      console.error('Status update failed:', err);
      Toast.error('Failed to update order status');
      btnEl.disabled = false;
    }
  }

  // ============================================
  // TIMER TICK (updates elapsed labels without full refetch)
  // ============================================
  setInterval(() => {
    document.querySelectorAll('.order-card').forEach(card => {
      const id = Number(card.dataset.orderId);
      const order = ordersById.get(id);
      if (!order) return;
      const { text, minutes } = elapsedLabel(order.created_at);
      const timerEl = card.querySelector('.order-timer');
      timerEl.textContent = text;
      timerEl.classList.remove('warn', 'urgent');
      const urgency = urgencyClass(minutes);
      if (urgency) timerEl.classList.add(urgency);

      card.classList.remove('warn-time', 'urgent-time');
      if (urgency === 'warn') card.classList.add('warn-time');
      if (urgency === 'urgent') card.classList.add('urgent-time');
    });
  }, 1000);

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
      socket.emit('join_room', 'kitchen');
      setConnectionStatus(true);
      fetchOrders({ silent: true });
    });

    socket.on('disconnect', () => setConnectionStatus(false));
    socket.on('connect_error', () => setConnectionStatus(false));

    // New order placed by a customer
    socket.on('new_order', () => {
      fetchOrders({ silent: true });
    });

    // Status changed (e.g. from another kitchen screen)
    socket.on('order_status_update', () => {
      fetchOrders({ silent: true });
    });

    // Table cleared by counter -> orders list may have changed
    socket.on('table_cleared', () => {
      fetchOrders({ silent: true });
    });
  }

  // ============================================
  // INIT
  // ============================================
  els.refreshBtn.addEventListener('click', () => fetchOrders());

  fetchOrders();
  initSocket();

  // Resilience: poll every 20s regardless of socket state
  setInterval(() => fetchOrders({ silent: true }), 20000);
})();
