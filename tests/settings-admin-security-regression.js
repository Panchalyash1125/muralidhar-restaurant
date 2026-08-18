const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
};

const server = read('backend/server.js');
const adminLoginHtml = read('admin/index.html');
const adminLoginJs = read('admin/script.js');
const dashboardHtml = read('admin/dashboard.html');
const dashboardJs = read('admin/dashboard.js');
const guardJs = read('admin/dashboard-guard.js');
const settingsJs = read('shared/js/restaurant-settings.js');
const counterJs = read('counter/script.js');
const menuService = read('shared/js/menu-service.js');

// Image upload contract.
assert(dashboardJs.includes('file.size > 5 * 1024 * 1024'), 'Admin menu image frontend limit is 5 MB');
assert(!dashboardJs.includes('750 * 1024') && !dashboardJs.includes('750KB'), 'Old 750 KB menu image limit is removed');
assert(dashboardJs.includes("'image/jpeg', 'image/png', 'image/webp'"), 'Frontend accepts JPG/JPEG, PNG and WEBP');
assert(server.includes('limits: { fileSize: 5 * 1024 * 1024 }'), 'Backend Multer image limit is 5 MB');
assert(server.includes("'Image size must be less than 5 MB.'"), 'Oversize backend upload returns a clear 5 MB validation message');

// Restaurant settings source of truth.
for (const key of ['restaurant_name', 'logo_url', 'contact_phone', 'whatsapp_number', 'gst_number', 'address', 'email', 'description']) {
  assert(server.includes(`'${key}'`), `Backend restaurant settings includes ${key}`);
}
assert(server.includes("res.set('Cache-Control', 'no-store')"), 'Restaurant settings API disables stale browser/proxy caching');
assert(settingsJs.includes("cache: 'no-store'"), 'Frontend restaurant settings fetch bypasses cache');
for (const page of [
  'customer/index.html', 'customer/menu.html', 'customer/cart.html', 'customer/success.html',
  'kitchen/index.html', 'counter/index.html', 'admin/index.html', 'admin/dashboard.html'
]) {
  assert(read(page).includes('restaurant-settings.js'), `${page} loads shared restaurant settings`);
}
assert(counterJs.includes('RestaurantSettings.refresh()'), 'Counter bill refreshes current restaurant settings before displaying receipt');
assert(counterJs.includes('GSTIN:'), 'Counter bill/receipt shows current GSTIN');

// Admin security contract.
assert(!adminLoginHtml.includes('admin123') && !adminLoginJs.includes('admin123'), 'Admin password is not exposed in Admin frontend files');
assert(!adminLoginHtml.includes('Demo credentials') && !adminLoginHtml.includes('Keep me signed in'), 'Visible demo password hint and persistent login option are removed');
assert(adminLoginHtml.includes('Enter Admin Password'), 'Admin password placeholder is non-secret');
assert(adminLoginJs.includes("API.post('/admin/login'"), 'Admin credentials are sent to backend login API for validation');
assert(!adminLoginJs.includes('localStorage') && !adminLoginJs.includes('Storage.set('), 'Admin login no longer persists authentication in localStorage');
assert(server.includes('DEFAULT_ADMIN_PASSWORD_HASH') && server.includes('bcrypt.compare'), 'Backend has a bcrypt-only initial Admin password fallback');
assert(!server.includes("'admin123'") && !server.includes('\"admin123\"'), 'Initial Admin password is not stored as plain text in backend code');
assert(server.includes("key = 'admin_password_hash'") && server.includes("upsertSetting('admin_password_hash', newHash)"), 'Changed Admin password hash is stored in the existing settings table');
assert(server.includes("app.post('/api/admin/change-password'"), 'Authenticated Admin password change API exists');
assert(server.includes("app.use('/api/admin', requireAdminAuth)"), 'Admin API routes are protected by server-side authentication middleware');
assert(guardJs.includes("params.get('auth')") && guardJs.includes('history.replaceState'), 'Dashboard consumes one-opening token and removes it from URL');
assert(dashboardHtml.includes('style="visibility:hidden"'), 'Dashboard stays hidden until backend token validation succeeds');
assert(dashboardJs.includes("API.get('/admin/session')"), 'Dashboard validates backend admin session before becoming visible');
assert(dashboardJs.includes("window.location.replace('index.html')"), 'Invalid/refresh/direct dashboard access returns to Admin login');
assert(dashboardJs.includes("API.post('/admin/logout'"), 'Logout invalidates backend admin token');
assert(dashboardHtml.includes('Change Admin Username') && dashboardHtml.includes('newAdminUsername'), 'Admin Settings contains Change Username controls');
assert(dashboardJs.includes("API.post('/admin/change-username'"), 'Admin Settings submits username changes to protected backend API');
assert(server.includes("key = 'admin_username'") && server.includes("upsertSetting('admin_username', newUsername)"), 'Changed Admin username is stored in the existing settings table');
assert(dashboardHtml.includes('Change Admin Password') && dashboardHtml.includes('currentAdminPassword'), 'Admin Settings contains Change Password controls');
assert(dashboardJs.includes("API.post('/admin/change-password'"), 'Admin Settings submits password changes to protected backend API');
assert(menuService.includes('Authorization = `Bearer ${window.__ADMIN_ACCESS_TOKEN}`'), 'Admin menu CRUD sends backend auth token');

console.log('\nAll settings/image/admin-security regression checks passed.');
