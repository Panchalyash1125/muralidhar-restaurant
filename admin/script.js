/**
 * Admin login. Credentials are validated by the backend only.
 * No password or persistent admin session is stored in the browser.
 */
(() => {
  const els = {
    loginCard: document.getElementById('loginCard'),
    loginForm: document.getElementById('loginForm'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    togglePassword: document.getElementById('togglePassword'),
    formError: document.getElementById('formError'),
    loginBtn: document.getElementById('loginBtn'),
    year: document.getElementById('year')
  };

  if (els.year) els.year.textContent = new Date().getFullYear();

  function showLogin() {
    els.loginCard.classList.remove('hidden');
    els.loginForm.reset();
    hideError();
    setLoading(false);
  }

  function showError(message) {
    els.formError.textContent = message;
    els.formError.classList.remove('hidden');
    [els.username, els.password].forEach(input => {
      const wrap = input.closest('.input-wrap');
      if (!wrap) return;
      wrap.classList.remove('shake');
      void wrap.offsetWidth;
      wrap.classList.add('shake');
    });
  }

  function hideError() {
    els.formError.classList.add('hidden');
    els.formError.textContent = '';
  }

  function setLoading(isLoading) {
    els.loginBtn.disabled = isLoading;
    els.loginBtn.querySelector('.btn-label').classList.toggle('hidden', isLoading);
    els.loginBtn.querySelector('.btn-spinner').classList.toggle('hidden', !isLoading);
  }

  els.togglePassword.addEventListener('click', () => {
    const isPassword = els.password.type === 'password';
    els.password.type = isPassword ? 'text' : 'password';
    els.togglePassword.textContent = isPassword ? '🙈' : '👁️';
    els.togglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });

  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const username = els.username.value.trim();
    const password = els.password.value;
    if (!username || !password) {
      showError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/admin/login', { username, password });
      const token = response?.data?.token;
      if (!token) throw new Error('Admin login did not return an access token.');

      // The token is passed only once in the URL fragment. dashboard-guard.js
      // removes it immediately and keeps it in memory only. Refresh/reopen has
      // no token and therefore returns to this login screen.
      window.location.replace(`dashboard.html#auth=${encodeURIComponent(token)}`);
    } catch (error) {
      showError(error.message || 'Invalid username or password.');
      setLoading(false);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    Toast.init();
    showLogin();
  }, { once: true });

  if (document.readyState !== 'loading') {
    Toast.init();
    showLogin();
  }
})();
