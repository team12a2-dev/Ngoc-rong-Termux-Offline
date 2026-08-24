const TOKEN_KEY = 'nro_panel_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export { getServerId, setServerId, serverPath } from './serverContext.js';

function httpToWs(url) {
  return url.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
}

/** WebSocket base URL — dev connects directly to Panel API (avoids Vite WS proxy issues). */
export function getWsBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) return httpToWs(apiUrl);
  if (import.meta.env.DEV) return 'ws://127.0.0.1:3001';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}`;
}

let refreshPromise = null;

export function redirectToLogin() {
  clearToken();
  if (window.location.pathname !== '/login' && window.location.pathname !== '/setup') {
    window.location.href = '/login';
  }
}

/** Renew JWT using current token (works even when expired but signature valid). */
export async function refreshSession() {
  const token = getToken();
  if (!token) {
    return null;
  }
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const base = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${base}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || json.ok === false || !json.data?.token) {
        return null;
      }
      setToken(json.data.token);
      return json.data.token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function api(path, options = {}, retried = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const base = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${base}/api/v1${path}`, { ...options, headers });

  if (
    res.status === 401
    && !retried
    && path !== '/auth/login'
    && path !== '/auth/refresh'
  ) {
    const newToken = await refreshSession();
    if (newToken) {
      return api(path, options, true);
    }
    redirectToLogin();
    throw new Error('Phiên đăng nhập hết hạn — đăng nhập lại.');
  }

  const json = await res.json().catch(() => ({ ok: false }));
  if (!res.ok || json.ok === false) {
    const hint = res.status === 404 ? ' — kiểm tra Panel API đã restart chưa' : '';
    const error = new Error(json.error || `Request failed (${res.status})${hint}`);
    error.status = res.status;
    error.data = json.data;
    throw error;
  }
  return json;
}
