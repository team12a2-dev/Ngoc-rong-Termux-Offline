const ROUTE_ICONS = {
  '/': 'dashboard',
  '/servers-mgmt': 'servers',
  '/players': 'online',
  '/players-db': 'players',
  '/accounts': 'accounts',
  '/server': 'control',
  '/boss': 'boss',
  '/giftcodes': 'giftcode',
  '/shops': 'shop',
  '/clans': 'clan',
  '/rankings': 'ranking',
  '/economy': 'economy',
  '/config': 'config',
  '/plugins': 'plugin',
  '/alerts': 'alert',
  '/backups': 'backup',
  '/logs': 'logs',
};

export function getPageIcon(pathname) {
  return ROUTE_ICONS[pathname] || 'dashboard';
}
