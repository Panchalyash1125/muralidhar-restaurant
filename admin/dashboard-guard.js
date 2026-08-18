/**
 * One-opening-only Admin dashboard guard.
 * A valid backend-issued token must arrive in the URL fragment from login.
 * The fragment is removed immediately, so refresh/reopen/direct URL requires login again.
 */
(() => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = params.get('auth');
  if (!token) {
    window.location.replace('index.html');
    return;
  }

  window.__ADMIN_ACCESS_TOKEN = token;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  // Browsers may restore a closed page from back-forward cache. Treat that as a
  // new opening and require the password again.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      window.__ADMIN_ACCESS_TOKEN = null;
      window.location.replace('index.html');
    }
  });
})();
