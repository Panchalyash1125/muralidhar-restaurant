/**
 * ============================================
 * MURALIDHAR RESTAURANT - ADMIN DASHBOARD
 * ============================================
 * Powers two screens on this page:
 *   1. Dashboard  - live stat cards (tables, orders, revenue)
 *   2. Menu Mgmt  - full CRUD for menu items (add/edit/delete/
 *                   hide/show/upload image), backed by the shared
 *                   LocalStorage MenuService.
 */

(() => {
  const accessToken = window.__ADMIN_ACCESS_TOKEN;
  if (!accessToken) {
    window.location.replace('index.html');
    return;
  }

  // ============================================
  // ELEMENT REFERENCES
  // ============================================
  const els = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    hamburgerBtn: document.getElementById('hamburgerBtn'),
    navItems: document.querySelectorAll('.nav-item'),
    topbarTitle: document.getElementById('topbarTitle'),
    refreshBtn: document.getElementById('refreshBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    sidebarUsername: document.getElementById('sidebarUsername'),

    viewDashboard: document.getElementById('view-dashboard'),
    viewMenu: document.getElementById('view-menu'),
    viewReports: document.getElementById('view-reports'),
    viewSettings: document.getElementById('view-settings'),
    statsUpdated: document.getElementById('statsUpdated'),

    // Menu management
    menuGrid: document.getElementById('menuGrid'),
    menuEmptyState: document.getElementById('menuEmptyState'),
    menuSearch: document.getElementById('menuSearch'),
    menuCategoryFilter: document.getElementById('menuCategoryFilter'),
    menuStatusFilter: document.getElementById('menuStatusFilter'),
    addItemBtn: document.getElementById('addItemBtn'),

    // Item modal
    itemModalOverlay: document.getElementById('itemModalOverlay'),
    itemModalTitle: document.getElementById('itemModalTitle'),
    itemModalClose: document.getElementById('itemModalClose'),
    itemForm: document.getElementById('itemForm'),
    itemId: document.getElementById('itemId'),
    itemName: document.getElementById('itemName'),
    itemDescription: document.getElementById('itemDescription'),
    itemCategory: document.getElementById('itemCategory'),
    itemPrice: document.getElementById('itemPrice'),
    itemPrepTime: document.getElementById('itemPrepTime'),
    itemDisplayOrder: document.getElementById('itemDisplayOrder'),
    itemIsVeg: document.getElementById('itemIsVeg'),
    itemIsBestSeller: document.getElementById('itemIsBestSeller'),
    itemIsAvailable: document.getElementById('itemIsAvailable'),
    itemImage: document.getElementById('itemImage'),
    imagePreview: document.getElementById('imagePreview'),
    itemFormError: document.getElementById('itemFormError'),
    itemCancelBtn: document.getElementById('itemCancelBtn'),
    itemSaveBtn: document.getElementById('itemSaveBtn'),

    // Delete modal
    deleteModalOverlay: document.getElementById('deleteModalOverlay'),
    deleteModalClose: document.getElementById('deleteModalClose'),
    deleteItemName: document.getElementById('deleteItemName'),
    deleteCancelBtn: document.getElementById('deleteCancelBtn'),
    deleteConfirmBtn: document.getElementById('deleteConfirmBtn'),

    // Reports
    reportsTabs: document.querySelectorAll('#reportsTabs .tab-btn'),
    reportDate: document.getElementById('reportDate'),
    reportsRangeLabel: document.getElementById('reportsRangeLabel'),
    exportSalesBtn: document.getElementById('exportSalesBtn'),
    exportBestSellersBtn: document.getElementById('exportBestSellersBtn'),
    salesChart: document.getElementById('salesChart'),
    salesChartEmpty: document.getElementById('salesChartEmpty'),
    bestSellersBody: document.getElementById('bestSellersBody'),
    bestSellersEmpty: document.getElementById('bestSellersEmpty'),

    // Restaurant Settings
    settingsForm: document.getElementById('settingsForm'),
    settingsLogo: document.getElementById('settingsLogo'),
    settingsLogoPreview: document.getElementById('settingsLogoPreview'),
    settingsLogoPlaceholder: document.getElementById('settingsLogoPlaceholder'),
    settingsRemoveLogoBtn: document.getElementById('settingsRemoveLogoBtn'),
    settingsName: document.getElementById('settingsName'),
    settingsPhone: document.getElementById('settingsPhone'),
    settingsWhatsapp: document.getElementById('settingsWhatsapp'),
    settingsGst: document.getElementById('settingsGst'),
    settingsAddress: document.getElementById('settingsAddress'),
    settingsEmail: document.getElementById('settingsEmail'),
    settingsDescription: document.getElementById('settingsDescription'),
    settingsOpeningTime: document.getElementById('settingsOpeningTime'),
    settingsClosingTime: document.getElementById('settingsClosingTime'),
    settingsFormError: document.getElementById('settingsFormError'),
    settingsFormSuccess: document.getElementById('settingsFormSuccess'),
    settingsSaveBtn: document.getElementById('settingsSaveBtn')
  };

  let currentView = 'dashboard';
  let categories = [];
  let menuItems = [];
  let pendingDeleteId = null;
  let selectedImageFile = null;
  let dashboardPollTimer = null;
  let reportsRange = 'daily';
  let settingsLoaded = false;
  let selectedLogoFile = null;
  let removeLogoRequested = false;
  let currentLogoUrl = null;

  els.sidebarUsername.textContent = 'Admin';

  // ============================================
  // SIDEBAR / NAVIGATION
  // ============================================
  function openSidebar() {
    els.sidebar.classList.add('open');
    els.sidebarOverlay.classList.add('visible');
  }
  function closeSidebar() {
    els.sidebar.classList.remove('open');
    els.sidebarOverlay.classList.remove('visible');
  }

  els.hamburgerBtn.addEventListener('click', () => {
    els.sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  els.sidebarOverlay.addEventListener('click', closeSidebar);

  els.navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      closeSidebar();
    });
  });

  function switchView(view) {
    currentView = view;
    els.navItems.forEach(b => b.classList.toggle('active', b.dataset.view === view));

    els.viewDashboard.classList.add('hidden');
    els.viewMenu.classList.add('hidden');
    els.viewReports.classList.add('hidden');
    els.viewSettings.classList.add('hidden');
    stopDashboardPolling();

    if (view === 'dashboard') {
      els.viewDashboard.classList.remove('hidden');
      els.topbarTitle.textContent = 'Dashboard';
      loadDashboardStats();
      startDashboardPolling();
    } else if (view === 'reports') {
      els.viewReports.classList.remove('hidden');
      els.topbarTitle.textContent = 'Reports';
      loadReports();
    } else if (view === 'settings') {
      els.viewSettings.classList.remove('hidden');
      els.topbarTitle.textContent = 'Restaurant Settings';
      loadRestaurantSettings();
    } else {
      els.viewMenu.classList.remove('hidden');
      els.topbarTitle.textContent = 'Menu Management';
      MenuService.refresh(true).then(async () => {
        await loadCategories();
        await loadMenuItems();
      });
    }
  }

  els.refreshBtn.addEventListener('click', () => {
    els.refreshBtn.classList.add('spinning');
    const done = () => els.refreshBtn.classList.remove('spinning');
    if (currentView === 'dashboard') {
      loadDashboardStats().finally(done);
    } else if (currentView === 'reports') {
      loadReports().finally(done);
    } else if (currentView === 'settings') {
      loadRestaurantSettings().finally(done);
    } else {
      MenuService.refresh(true).then(loadMenuItems).finally(done);
    }
  });

  // ============================================
  // LOGOUT
  // ============================================
  els.logoutBtn.addEventListener('click', async () => {
    els.logoutBtn.disabled = true;
    try {
      await API.post('/admin/logout', {});
    } catch (error) {
      console.warn('Admin logout request:', error);
    } finally {
      window.__ADMIN_ACCESS_TOKEN = null;
      window.location.replace('index.html');
    }
  });

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async function loadDashboardStats() {
    try {
      const res = await API.get('/admin/dashboard/stats');
      const data = res.data;

      setStat('totalTables', data.totalTables);
      setStat('occupiedTables', data.occupiedTables);
      setStat('freeTables', data.freeTables);
      setStat('todayOrders', data.todayOrders);
      setStat('todayRevenue', Formatters.price(data.todayRevenue));
      setStat('pendingOrders', data.pendingOrders);
      setStat('completedOrders', data.completedOrders);

      els.statsUpdated.textContent = `Last updated ${Formatters.time(new Date())}`;
    } catch (err) {
      Toast.error('Failed to load dashboard stats');
    }
  }

  function setStat(field, value) {
    const el = document.querySelector(`[data-field="${field}"]`);
    if (el) el.textContent = value;
  }

  function startDashboardPolling() {
    stopDashboardPolling();
    dashboardPollTimer = setInterval(loadDashboardStats, 30000);
  }
  function stopDashboardPolling() {
    if (dashboardPollTimer) clearInterval(dashboardPollTimer);
    dashboardPollTimer = null;
  }

  // ============================================
  // MENU MANAGEMENT - LOCALSTORAGE DATA LAYER
  // ============================================
  async function loadCategories() {
    const standardCategories = ['beverages', 'breakfast', 'bread', 'main-course', 'snacks', 'dessert', 'other'];
    const menuCategories = MenuService.getMenu().map(item => item.category).filter(Boolean);
    const names = [...new Set([...standardCategories, ...menuCategories])].sort();

    categories = names.map(name => ({ id: name, name: formatCategoryName(name) }));
    const options = categories
      .map(c => `<option value="${Validators.sanitize(c.id)}">${Validators.sanitize(c.name)}</option>`)
      .join('');

    els.itemCategory.innerHTML = options;
    els.menuCategoryFilter.innerHTML = `<option value="all">All Categories</option>${options}`;
  }

  function formatCategoryName(value) {
    return String(value || 'other')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async function loadMenuItems() {
    const search = els.menuSearch.value.trim().toLowerCase();
    const category = els.menuCategoryFilter.value;
    const status = els.menuStatusFilter.value;

    menuItems = MenuService.getMenu().filter(item => {
      const matchesSearch = !search ||
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search);
      const matchesCategory = !category || category === 'all' || item.category === category;
      const matchesStatus = !status || status === 'all' ||
        (status === 'available' && item.isAvailable) ||
        (status === 'hidden' && !item.isAvailable);
      return matchesSearch && matchesCategory && matchesStatus;
    });

    renderMenuGrid();
  }

  const debouncedLoadMenuItems = Utils.debounce(loadMenuItems, 250);
  els.menuSearch.addEventListener('input', debouncedLoadMenuItems);
  els.menuCategoryFilter.addEventListener('change', loadMenuItems);
  els.menuStatusFilter.addEventListener('change', loadMenuItems);

  // Re-render immediately when another tab/page changes the menu.
  MenuService.subscribe(() => {
    loadCategories();
    loadMenuItems();
  });

  // ============================================
  // MENU MANAGEMENT - RENDER
  // ============================================
  function renderMenuGrid() {
    if (menuItems.length === 0) {
      els.menuGrid.innerHTML = '';
      els.menuEmptyState.classList.remove('hidden');
      return;
    }
    els.menuEmptyState.classList.add('hidden');

    els.menuGrid.innerHTML = menuItems.map(item => {
      const badges = [
        item.isVeg ? '<span class="badge badge-veg">Veg</span>' : '<span class="badge badge-nonveg">Non-Veg</span>',
        item.isBestSeller ? '<span class="badge badge-best">Best Seller</span>' : '',
        !item.isAvailable ? '<span class="badge badge-hidden">Hidden</span>' : ''
      ].join('');

      const imageContent = item.image
        ? `<img src="${Validators.sanitize(item.image)}" alt="${Validators.sanitize(item.name)}" onerror="this.parentElement.innerHTML='<span class=\'item-image-placeholder\'>🍽️</span>'">`
        : '<span class="item-image-placeholder">🍽️</span>';

      return `
        <article class="menu-item-card ${!item.isAvailable ? 'is-hidden' : ''}" data-id="${item.id}">
          <div class="item-image-wrap">
            ${imageContent}
            <div class="item-badges">${badges}</div>
          </div>
          <div class="item-body">
            <p class="item-name">${Validators.sanitize(item.name)}</p>
            <p class="item-category">${Validators.sanitize(formatCategoryName(item.category))}</p>
            ${item.description ? `<p class="item-description">${Validators.sanitize(item.description)}</p>` : ''}
            <p class="item-price">${Formatters.price(item.price)}</p>
          </div>
          <div class="item-actions">
            <button class="btn-edit" data-action="edit" data-id="${item.id}">✏️ Edit</button>
            ${item.isAvailable
              ? `<button class="btn-toggle-hide" data-action="hide" data-id="${item.id}">🙈 Hide</button>`
              : `<button class="btn-toggle-show" data-action="show" data-id="${item.id}">👁️ Show</button>`}
            <button class="btn-delete" data-action="delete" data-id="${item.id}">🗑️ Delete</button>
          </div>
        </article>
      `;
    }).join('');
  }

  els.menuGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    const item = menuItems.find(m => m.id === id);
    if (!item) return;

    if (action === 'edit') openItemModal(item);
    else if (action === 'delete') openDeleteModal(item);
    else if (action === 'hide') toggleAvailability(item, false);
    else if (action === 'show') toggleAvailability(item, true);
  });

  async function toggleAvailability(item, makeAvailable) {
    try {
      await (makeAvailable ? MenuService.showDish(item.id) : MenuService.hideDish(item.id));
      Toast.success(makeAvailable ? `${item.name} is now visible` : `${item.name} is now hidden`);
      await loadMenuItems();
    } catch (err) {
      Toast.error(err.message || 'Failed to update availability');
    }
  }

  // ============================================
  // ADD / EDIT ITEM MODAL
  // ============================================
  async function openItemModal(item) {
    // Rebuild options every time so newly added/custom categories and all
    // standard categories are always visible in the dropdown.
    await loadCategories();
    els.itemForm.reset();
    hideFormError();
    selectedImageFile = null;

    if (item) {
      els.itemModalTitle.textContent = 'Edit Menu Item';
      els.itemId.value = item.id;
      els.itemName.value = item.name;
      els.itemDescription.value = item.description || '';
      els.itemCategory.value = item.category;
      els.itemPrice.value = item.price;
      els.itemPrepTime.value = item.preparationTime || '';
      els.itemDisplayOrder.value = item.displayOrder || 0;
      els.itemIsVeg.checked = !!item.isVeg;
      els.itemIsBestSeller.checked = !!item.isBestSeller;
      els.itemIsAvailable.checked = !!item.isAvailable;

      if (item.image) {
        els.imagePreview.src = item.image;
        els.imagePreview.classList.remove('hidden');
      } else {
        els.imagePreview.classList.add('hidden');
      }
    } else {
      els.itemModalTitle.textContent = 'Add Menu Item';
      els.itemId.value = '';
      els.itemCategory.value = categories.some(c => c.id === 'breakfast') ? 'breakfast' : (categories[0]?.id || 'other');
      els.itemIsVeg.checked = true;
      els.itemIsAvailable.checked = true;
      els.imagePreview.classList.add('hidden');
    }

    els.itemModalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeItemModal() {
    els.itemModalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    els.itemForm.reset();
    selectedImageFile = null;
  }

  els.addItemBtn.addEventListener('click', async () => {
    await openItemModal(null);
  });
  els.itemModalClose.addEventListener('click', closeItemModal);
  els.itemCancelBtn.addEventListener('click', closeItemModal);
  els.itemModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.itemModalOverlay) closeItemModal();
  });

  els.itemImage.addEventListener('change', () => {
    const file = els.itemImage.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showFormError('Please select a JPG, JPEG, PNG, or WEBP image.');
      els.itemImage.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showFormError('Image size must be less than 5 MB.');
      els.itemImage.value = '';
      return;
    }

    hideFormError();
    selectedImageFile = file;
    els.imagePreview.src = URL.createObjectURL(file);
    els.imagePreview.classList.remove('hidden');
  });

  function showFormError(msg) {
    els.itemFormError.textContent = msg;
    els.itemFormError.classList.remove('hidden');
  }
  function hideFormError() {
    els.itemFormError.classList.add('hidden');
    els.itemFormError.textContent = '';
  }

  function setSaveLoading(isLoading) {
    els.itemSaveBtn.disabled = isLoading;
    els.itemSaveBtn.querySelector('.btn-label').classList.toggle('hidden', isLoading);
    els.itemSaveBtn.querySelector('.btn-spinner').classList.toggle('hidden', !isLoading);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read image file'));
      reader.readAsDataURL(file);
    });
  }

  els.itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormError();

    const name = els.itemName.value.trim();
    const price = Number(els.itemPrice.value);
    const category = els.itemCategory.value;

    if (!name) return showFormError('Item name is required.');
    if (!Number.isFinite(price) || price < 0) return showFormError('Please enter a valid price.');
    if (!category) return showFormError('Please select a category.');

    const id = Number(els.itemId.value) || null;
    setSaveLoading(true);

    try {
      const existing = id ? MenuService.getMenu().find(item => item.id === id) : null;

      const dish = {
        name,
        description: els.itemDescription.value.trim(),
        category,
        categoryId: existing?.categoryId || category,
        price,
        preparationTime: Number(els.itemPrepTime.value) || 10,
        displayOrder: Number(els.itemDisplayOrder.value) || 0,
        isVeg: els.itemIsVeg.checked,
        isBestSeller: els.itemIsBestSeller.checked,
        isAvailable: els.itemIsAvailable.checked,
        imageFile: selectedImageFile || null
      };

      if (id) await MenuService.updateDish(id, dish);
      else await MenuService.addDish(dish);
      Toast.success(id ? 'Menu item updated' : 'Menu item added');
      closeItemModal();
      loadCategories();
      loadMenuItems();
    } catch (err) {
      showFormError(err.message || 'Failed to save menu item');
    } finally {
      setSaveLoading(false);
    }
  });

  // ============================================
  // DELETE ITEM MODAL
  // ============================================
  function openDeleteModal(item) {
    pendingDeleteId = item.id;
    els.deleteItemName.textContent = item.name;
    els.deleteModalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDeleteModal() {
    pendingDeleteId = null;
    els.deleteModalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  els.deleteModalClose.addEventListener('click', closeDeleteModal);
  els.deleteCancelBtn.addEventListener('click', closeDeleteModal);
  els.deleteModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.deleteModalOverlay) closeDeleteModal();
  });

  els.deleteConfirmBtn.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    els.deleteConfirmBtn.disabled = true;
    try {
      await MenuService.deleteDish(pendingDeleteId);
      Toast.success('Menu item deleted');
      closeDeleteModal();
      await loadCategories();
      await loadMenuItems();
    } catch (err) {
      Toast.error(err.message || 'Failed to delete menu item');
    } finally {
      els.deleteConfirmBtn.disabled = false;
    }
  });

  // ============================================
  // REPORTS - Daily / Weekly / Monthly Sales,
  // Best Selling Items, Revenue, CSV export
  // ============================================
  function todayLocalISO() {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now - tzOffsetMs).toISOString().slice(0, 10);
  }

  els.reportDate.value = todayLocalISO();

  els.reportsTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      reportsRange = btn.dataset.range;
      els.reportsTabs.forEach(b => b.classList.toggle('active', b === btn));
      loadReports();
    });
  });

  els.reportDate.addEventListener('change', loadReports);

  async function loadReports() {
    try {
      const date = els.reportDate.value || todayLocalISO();
      const [summaryRes, bestRes] = await Promise.all([
        API.get(`/admin/reports/summary?range=${reportsRange}&date=${date}`),
        API.get(`/admin/reports/best-sellers?range=${reportsRange}&date=${date}&limit=10`)
      ]);
      renderReportsSummary(summaryRes.data);
      renderBestSellers(bestRes.data);
    } catch (err) {
      Toast.error(err.message || 'Failed to load reports');
    }
  }

  function renderReportsSummary(data) {
    els.reportsRangeLabel.textContent = data.rangeLabel;

    setStat('rTotalRevenue', Formatters.price(data.totalRevenue));
    setStat('rTotalOrders', data.totalOrders);
    setStat('rAvgOrderValue', Formatters.price(data.avgOrderValue));
    setStat('rCompletedOrders', data.completedOrders);
    setStat('rCancelledOrders', data.cancelledOrders);
    setStat('rTotalGst', Formatters.price(data.totalGst));

    if (!data.chart || data.chart.length === 0 || data.totalOrders === 0) {
      els.salesChart.innerHTML = '';
      els.salesChartEmpty.classList.remove('hidden');
      return;
    }
    els.salesChartEmpty.classList.add('hidden');

    const maxRevenue = Math.max(...data.chart.map(c => c.revenue), 1);
    els.salesChart.innerHTML = data.chart.map(c => {
      const pct = c.revenue > 0 ? Math.max((c.revenue / maxRevenue) * 100, 3) : 0;
      return `
        <div class="sales-chart-row">
          <span class="sales-chart-label">${Validators.sanitize(c.label)}</span>
          <div class="sales-chart-bar-wrap">
            <div class="sales-chart-bar" style="width:${pct}%"></div>
          </div>
          <span class="sales-chart-value">${Formatters.price(c.revenue)}</span>
        </div>
      `;
    }).join('');
  }

  function renderBestSellers(items) {
    if (!items || items.length === 0) {
      els.bestSellersBody.innerHTML = '';
      els.bestSellersEmpty.classList.remove('hidden');
      return;
    }
    els.bestSellersEmpty.classList.add('hidden');

    els.bestSellersBody.innerHTML = items.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${Validators.sanitize(item.name)}</td>
        <td>${Validators.sanitize(item.category)}</td>
        <td>${item.quantitySold}</td>
        <td>${Formatters.price(item.revenue)}</td>
      </tr>
    `).join('');
  }

  async function downloadReportCsv(report) {
    const date = els.reportDate.value || todayLocalISO();
    const url = `${CONFIG.API_BASE_URL}/admin/reports/export?range=${reportsRange}&date=${date}&report=${report}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${window.__ADMIN_ACCESS_TOKEN}` }
      });
      if (response.status === 401) {
        window.__ADMIN_ACCESS_TOKEN = null;
        window.location.replace('index.html');
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : `${report}.csv`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      Toast.error(error.message || 'Failed to export report');
    }
  }

  els.exportSalesBtn.addEventListener('click', () => downloadReportCsv('sales'));
  els.exportBestSellersBtn.addEventListener('click', () => downloadReportCsv('best-sellers'));

  // ============================================
  // RESTAURANT SETTINGS
  // ============================================
  async function loadRestaurantSettings() {
    try {
      const res = await API.get('/settings/restaurant');
      populateSettingsForm(res.data);
      settingsLoaded = true;
    } catch (err) {
      Toast.error(err.message || 'Failed to load restaurant settings');
    }
  }

  function populateSettingsForm(data) {
    hideSettingsError();
    hideSettingsSuccess();
    selectedLogoFile = null;
    removeLogoRequested = false;
    currentLogoUrl = data.logo || null;

    els.settingsName.value = data.restaurantName || '';
    els.settingsPhone.value = data.phone || '';
    els.settingsWhatsapp.value = data.whatsapp || '';
    els.settingsGst.value = data.gstNumber || '';
    els.settingsAddress.value = data.address || '';
    els.settingsEmail.value = data.email || '';
    els.settingsDescription.value = data.description || '';
    els.settingsOpeningTime.value = data.openingTime || '';
    els.settingsClosingTime.value = data.closingTime || '';

    renderLogoPreview();
  }

  function renderLogoPreview() {
    if (selectedLogoFile) {
      els.settingsLogoPreview.src = URL.createObjectURL(selectedLogoFile);
      els.settingsLogoPreview.classList.remove('hidden');
      els.settingsLogoPlaceholder.classList.add('hidden');
      els.settingsRemoveLogoBtn.classList.remove('hidden');
    } else if (currentLogoUrl && !removeLogoRequested) {
      els.settingsLogoPreview.src = currentLogoUrl;
      els.settingsLogoPreview.classList.remove('hidden');
      els.settingsLogoPlaceholder.classList.add('hidden');
      els.settingsRemoveLogoBtn.classList.remove('hidden');
    } else {
      els.settingsLogoPreview.classList.add('hidden');
      els.settingsLogoPlaceholder.classList.remove('hidden');
      els.settingsRemoveLogoBtn.classList.add('hidden');
    }
  }

  els.settingsLogo.addEventListener('change', () => {
    const file = els.settingsLogo.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showSettingsError('Please select a JPG, JPEG, PNG, or WEBP image.');
      els.settingsLogo.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showSettingsError('Image size must be less than 5 MB.');
      els.settingsLogo.value = '';
      return;
    }

    hideSettingsError();
    selectedLogoFile = file;
    removeLogoRequested = false;
    renderLogoPreview();
  });

  els.settingsRemoveLogoBtn.addEventListener('click', () => {
    selectedLogoFile = null;
    removeLogoRequested = true;
    els.settingsLogo.value = '';
    renderLogoPreview();
  });

  function showSettingsError(msg) {
    els.settingsFormError.textContent = msg;
    els.settingsFormError.classList.remove('hidden');
  }
  function hideSettingsError() {
    els.settingsFormError.classList.add('hidden');
    els.settingsFormError.textContent = '';
  }
  function showSettingsSuccess(msg) {
    els.settingsFormSuccess.textContent = msg;
    els.settingsFormSuccess.classList.remove('hidden');
  }
  function hideSettingsSuccess() {
    els.settingsFormSuccess.classList.add('hidden');
    els.settingsFormSuccess.textContent = '';
  }

  function setSettingsSaveLoading(isLoading) {
    els.settingsSaveBtn.disabled = isLoading;
    els.settingsSaveBtn.querySelector('.btn-label').classList.toggle('hidden', isLoading);
    els.settingsSaveBtn.querySelector('.btn-spinner').classList.toggle('hidden', !isLoading);
  }

  els.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideSettingsError();
    hideSettingsSuccess();

    const name = els.settingsName.value.trim();
    const phone = els.settingsPhone.value.trim();
    const whatsapp = els.settingsWhatsapp.value.trim();
    const gst = els.settingsGst.value.trim();
    const email = els.settingsEmail.value.trim();
    const opening = els.settingsOpeningTime.value;
    const closing = els.settingsClosingTime.value;

    if (!name) return showSettingsError('Restaurant name is required.');
    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) return showSettingsError('Please enter a valid phone number.');
    if (whatsapp && !/^[0-9+\-\s()]{7,20}$/.test(whatsapp)) return showSettingsError('Please enter a valid WhatsApp number.');
    if (gst && !/^[0-9A-Za-z]{15}$/.test(gst)) return showSettingsError('GST number must be a valid 15-character GSTIN.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showSettingsError('Please enter a valid email address.');

    const formData = new FormData();
    formData.append('restaurant_name', name);
    formData.append('phone', phone);
    formData.append('whatsapp', whatsapp);
    formData.append('gst_number', gst);
    formData.append('address', els.settingsAddress.value.trim());
    formData.append('email', email);
    formData.append('description', els.settingsDescription.value.trim());
    formData.append('opening_time', opening);
    formData.append('closing_time', closing);
    if (removeLogoRequested) formData.append('remove_logo', 'true');
    if (selectedLogoFile) formData.append('logo', selectedLogoFile);

    setSettingsSaveLoading(true);

    try {
      const res = await uploadRestaurantSettings(formData);
      showSettingsSuccess('Restaurant settings updated successfully.');
      Toast.success('Restaurant settings updated');
      populateSettingsForm(res.data);
      if (typeof RestaurantSettings !== 'undefined') RestaurantSettings.apply(res.data);
    } catch (err) {
      showSettingsError(err.message || 'Failed to update restaurant settings');
    } finally {
      setSettingsSaveLoading(false);
    }
  });

  /**
   * Multipart PUT helper for the settings form - same rationale as
   * uploadFormData() above (lets the browser set the multipart
   * boundary instead of forcing an application/json content type).
   */
  async function uploadRestaurantSettings(formData) {
    const url = `${CONFIG.API_BASE_URL}/admin/settings/restaurant`;
    const response = await fetch(url, {
      method: 'PUT',
      body: formData,
      credentials: 'same-origin',
      headers: { Authorization: `Bearer ${window.__ADMIN_ACCESS_TOKEN}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }


  // ============================================
  // REAL-TIME ADMIN DASHBOARD SYNC
  // ============================================
  function initAdminSocket() {
    if (typeof io !== 'function') return;

    const socket = io(CONFIG.SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socket.on('connect', () => {
      socket.emit('join_room', 'admin');
    });

    socket.on('dashboard_update', () => {
      if (currentView === 'dashboard') loadDashboardStats();
    });

    // Fallback compatibility in case the server sends the generic events.
    socket.on('new_order', () => {
      if (currentView === 'dashboard') loadDashboardStats();
    });
    socket.on('order_status_update', () => {
      if (currentView === 'dashboard') loadDashboardStats();
    });
    socket.on('bill_paid', () => {
      if (currentView === 'dashboard') loadDashboardStats();
    });
    socket.on('menu_updated', async () => {
      await MenuService.refresh(true);
      if (currentView === 'menu') {
        await loadCategories();
        await loadMenuItems();
      }
    });
  }

  // ============================================
  // INIT
  // ============================================
  async function initAdminDashboard() {
    Toast.init();
    try {
      const sessionRes = await API.get('/admin/session');
      els.sidebarUsername.textContent = sessionRes?.data?.username || 'Admin';
      document.body.style.visibility = 'visible';
      switchView('dashboard');
      initAdminSocket();
      if (typeof RestaurantSettings !== 'undefined') RestaurantSettings.refresh().catch(() => {});
    } catch (error) {
      window.__ADMIN_ACCESS_TOKEN = null;
      window.location.replace('index.html');
    }
  }

  initAdminDashboard();
})();
