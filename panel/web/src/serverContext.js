const SERVER_KEY = 'nro_panel_server_id';

export function getServerId() {
  return Number(localStorage.getItem(SERVER_KEY) || 1);
}

export function setServerId(id) {
  localStorage.setItem(SERVER_KEY, String(id));
  window.dispatchEvent(new CustomEvent('server-changed', { detail: id }));
}

export function serverPath(path) {
  const base = path.startsWith('/') ? path : `/${path}`;
  if (base.startsWith('/servers/')) return base;
  return `/servers/${getServerId()}${base}`;
}
