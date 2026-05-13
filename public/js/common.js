/**
 * BudgetWise — shared frontend helpers.
 *
 * Exposes window.BW with:
 *   - API base path
 *   - token-guarded apiFetch(path, opts)
 *   - toast(message, kind)         — success | error | info | warning
 *   - escapeHtml(s)
 *   - money(n)                     — formats with EGP prefix and sign
 *   - debounce(fn, ms)
 *   - bindCommonChrome()           — wires #menuBtn / #logoutBtn / 401-redirect
 *
 * Loaded as a non-module script BEFORE each page's inline IIFE.
 */
(function () {
  'use strict';

  // When running locally (npm start), the backend is on the same origin, so a
  // relative path works. When the frontend is deployed to Netlify, the backend
  // lives on Render — point at it explicitly. Replace the URL below with your
  // own Render service URL (Render dashboard → your service → top of page).
  const RENDER_BACKEND_URL = 'https://budgetwise-backend.onrender.com';
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const API_BASE = isLocal ? '/api/v1' : `${RENDER_BACKEND_URL}/api/v1`;

  function getToken() {
    return localStorage.getItem('token');
  }

  function clearTokenAndRedirect() {
    localStorage.removeItem('token');
    window.location.replace('./login.html');
  }

  /**
   * Auth-aware fetch wrapper.
   * - Sends Authorization header automatically.
   * - Treats 401 as session-expired and redirects to /login.
   * - Returns parsed JSON; on non-OK throws Error(data.error).
   */
  async function apiFetch(path, opts = {}) {
    const token = getToken();
    const isFormBody = opts.body instanceof FormData;
    const headers = {
      Authorization: token ? `Bearer ${token}` : '',
      ...(opts.headers || {}),
    };
    if (!isFormBody && !headers['Content-Type'] && opts.body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

    if (res.status === 401) {
      clearTokenAndRedirect();
      throw new Error('Unauthorized');
    }
    // Non-JSON responses (e.g. CSV/PDF) are returned as the raw Response object
    // so callers can stream the blob.
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      return res;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  /**
   * Lightweight toast notification.
   * Stacks in a fixed bottom-right container, auto-dismisses after `duration` ms.
   */
  function ensureToastContainer() {
    let el = document.getElementById('bw-toasts');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bw-toasts';
      el.className = 'toast-container';
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  function toast(message, kind = 'info', duration = 3500) {
    const container = ensureToastContainer();
    const node = document.createElement('div');
    node.className = `toast toast-${kind}`;
    node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    node.textContent = message;
    container.appendChild(node);
    // Force reflow so the entrance transition runs.
    void node.offsetWidth;
    node.classList.add('toast-in');

    const close = () => {
      node.classList.remove('toast-in');
      node.classList.add('toast-out');
      node.addEventListener('transitionend', () => node.remove(), { once: true });
    };
    node.addEventListener('click', close);
    setTimeout(close, duration);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function money(n, { signed = false } = {}) {
    const num = Number(n) || 0;
    const formatted = Math.abs(num).toFixed(2);
    if (!signed) return `EGP ${formatted}`;
    if (num > 0) return `+EGP ${formatted}`;
    if (num < 0) return `-EGP ${formatted}`;
    return `EGP ${formatted}`;
  }

  function debounce(fn, ms = 250) {
    let t;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /**
   * Wire common page chrome:
   *  - Redirects to /login when no token is present.
   *  - Toggles the sidebar via #menuBtn.
   *  - Logs out via #logoutBtn.
   * Returns true if the page can continue executing, false if it redirected.
   */
  function bindCommonChrome() {
    if (!getToken()) {
      clearTokenAndRedirect();
      return false;
    }
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        toast('Signed out', 'info', 1200);
        setTimeout(clearTokenAndRedirect, 250);
      });
    }
    return true;
  }

  window.BW = {
    API_BASE,
    getToken,
    apiFetch,
    toast,
    escapeHtml,
    money,
    debounce,
    bindCommonChrome,
  };
})();
