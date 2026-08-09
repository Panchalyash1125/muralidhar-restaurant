/**
 * ============================================
 * MURALIDHAR RESTAURANT - ADMIN LOGIN
 * ============================================
 * Login screen + client-side session handling for the Admin module.
 * On successful login this redirects to dashboard.html, which owns
 * its own session guard, logout button, Dashboard cards, and Menu
 * Management screen (see dashboard.js).
 *
 * NOTE: Credential verification is currently a local demo check
 * (username: admin / password: admin123), mirroring the DEMO_OTP
 * pattern already used by the Customer OTP flow in this project.
 * When the Admin API is added, only `verifyCredentials()` below
 * needs to be swapped for a real POST /api/admin/login call - no
 * other part of this file needs to change.
 */

(() => {
  const SESSION_KEY = 'muralidhar_admin_session';
  const SESSION_TTL_SHORT = 60 * 60 * 8;       // 8 hours (normal login)
  const SESSION_TTL_REMEMBER = 60 * 60 * 24 * 7; // 7 days ("keep me signed in")

  const DEMO_USERNAME = 'admin';
  const DEMO_PASSWORD = 'admin123';

  const els = {
    loginCard: document.getElementById('loginCard'),
    loginForm: document.getElementById('loginForm'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    rememberMe: document.getElementById('rememberMe'),
    togglePassword: document.getElementById('togglePassword'),
    formError: document.getElementById('formError'),
    loginBtn: document.getElementById('loginBtn'),
    year: document.getElementById('year')
  };

  els.year.textContent = new Date().getFullYear();

  // ============================================
  // CREDENTIAL VERIFICATION (demo placeholder)
  // ============================================
  function verifyCredentials(username, password) {
    return username === DEMO_USERNAME && password === DEMO_PASSWORD;
  }

  // ============================================
  // SESSION HELPERS (built on shared Storage util)
  // ============================================
  function createSession(username, ttlSeconds) {
    const session = {
      username,
      role: 'admin',
      loginAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000
    };
    Storage.set(SESSION_KEY, session, ttlSeconds);
    return session;
  }

  function getSession() {
    return Storage.get(SESSION_KEY);
  }

  function clearSession() {
    Storage.remove(SESSION_KEY);
  }

  // ============================================
  // VIEW SWITCHING
  // ============================================
  function showLogin() {
    els.loginCard.classList.remove('hidden');
    els.loginForm.reset();
    hideError();
  }

  function goToDashboard() {
    window.location.href = 'dashboard.html';
  }

  function renderFromSession() {
    const session = getSession();
    if (session) {
      goToDashboard();
    } else {
      showLogin();
    }
  }

  // ============================================
  // ERROR HANDLING
  // ============================================
  function showError(message) {
    els.formError.textContent = message;
    els.formError.classList.remove('hidden');
    [els.username, els.password].forEach(input => {
      const wrap = input.closest('.input-wrap');
      wrap.classList.remove('shake');
      // Force reflow so the shake animation can replay
      void wrap.offsetWidth;
      wrap.classList.add('shake');
    });
  }

  function hideError() {
    els.formError.classList.add('hidden');
    els.formError.textContent = '';
  }

  // ============================================
  // PASSWORD VISIBILITY TOGGLE
  // ============================================
  els.togglePassword.addEventListener('click', () => {
    const isPassword = els.password.type === 'password';
    els.password.type = isPassword ? 'text' : 'password';
    els.togglePassword.textContent = isPassword ? '🙈' : '👁️';
    els.togglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });

  // ============================================
  // LOGIN SUBMIT
  // ============================================
  els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideError();

    const username = els.username.value.trim();
    const password = els.password.value;

    if (!username || !password) {
      showError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    // Simulate a brief network round-trip so the UI feels real;
    // replace with an awaited fetch() to POST /api/admin/login later.
    setTimeout(() => {
      if (verifyCredentials(username, password)) {
        const ttl = els.rememberMe.checked ? SESSION_TTL_REMEMBER : SESSION_TTL_SHORT;
        createSession(username, ttl);
        Toast.success(`Welcome, ${username}!`);
        setTimeout(goToDashboard, 300);
      } else {
        showError('Invalid username or password.');
        setLoading(false);
      }
    }, 400);
  });

  function setLoading(isLoading) {
    els.loginBtn.disabled = isLoading;
    els.loginBtn.querySelector('.btn-label').classList.toggle('hidden', isLoading);
    els.loginBtn.querySelector('.btn-spinner').classList.toggle('hidden', !isLoading);
  }

  // ============================================
  // INIT
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    Toast.init();
    renderFromSession();
  });

  // In case DOMContentLoaded already fired (script at end of body)
  if (document.readyState !== 'loading') {
    Toast.init();
    renderFromSession();
  }
})();
