import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { clearToken, getToken, refreshSession } from '../api';
import { useShopRacePreview } from '../hooks/useShopRacePreview';
import { genderLabel, raceBadgeClass, shopRacePreviewTitle } from '../utils/shopRace';
import ServerSelector from './ServerSelector';
import NavIcon from './NavIcon';

const navGroups = [
  {
    label: 'Tổng quan',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/servers-mgmt', label: 'Servers', icon: 'servers' },
    ],
  },
  {
    label: 'Người chơi',
    items: [
      { to: '/players', label: 'Online', icon: 'online' },
      { to: '/players-db', label: 'Quản lý Player', icon: 'players' },
      { to: '/accounts', label: 'Accounts', icon: 'accounts' },
    ],
  },
  {
    label: 'Game & Server',
    items: [
      { to: '/server', label: 'Server Control', icon: 'control' },
      { to: '/boss', label: 'Boss', icon: 'boss' },
      { to: '/giftcodes', label: 'Giftcodes', icon: 'giftcode' },
      { to: '/shops', label: 'Cửa hàng', icon: 'shop' },
      { to: '/clans', label: 'Clans', icon: 'clan' },
      { to: '/rankings', label: 'Bảng xếp hạng', icon: 'ranking' },
      { to: '/economy', label: 'Kinh tế', icon: 'economy' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { to: '/config', label: 'Cấu hình', icon: 'config' },
      { to: '/plugins', label: 'Plugins', icon: 'plugin' },
      { to: '/alerts', label: 'Alerts', icon: 'alert' },
      { to: '/backups', label: 'Backups', icon: 'backup' },
      { to: '/logs', label: 'Audit Logs', icon: 'logs' },
    ],
  },
];

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [sessionReady, setSessionReady] = useState(false);
  const [shopRacePreview] = useShopRacePreview();

  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      if (!getToken()) {
        navigate('/login', { replace: true });
        return;
      }
      const token = await refreshSession();
      if (cancelled) return;
      if (!token) {
        clearToken();
        navigate('/login', { replace: true });
        return;
      }
      setSessionReady(true);
    }

    initSession();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function logout() {
    clearToken();
    navigate('/login');
  }

  if (!sessionReady) {
    return (
      <div className="layout layout-loading">
        <div className="layout-bg" />
        <div className="layout-loading-inner">
          <span className="ui-spinner" aria-hidden="true" />
          <p>Đang xác thực phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <div className="layout-bg" />

      <aside className="sidebar">
        <header className="sidebar-brand">
          <img
            src="/brand-logo.png"
            alt="AMODSUBVN"
            className="sidebar-brand-logo"
          />
        </header>
        <div className="sidebar-brand-caption">
          <span className="sidebar-brand-caption-title">NRO Control Panel</span>
          <span className="sidebar-brand-caption-credit">
            Developer panel by <strong>AmodsubVN</strong>
          </span>
        </div>

        <div className="sidebar-main">
        <div className="sidebar-server">
          <span className="sidebar-server-label">Server</span>
          <ServerSelector />
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map(({ to, label, icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  title={to === '/shops' && shopRacePreview ? shopRacePreviewTitle(shopRacePreview) : undefined}
                >
                  <span className="nav-link-icon">
                    <NavIcon name={icon} />
                  </span>
                  <span className="nav-link-text">{label}</span>
                  {to === '/shops' && shopRacePreview ? (
                    <span
                      className={`nav-link-race-badge player-gender-badge ${raceBadgeClass(shopRacePreview)}`}
                      title={shopRacePreviewTitle(shopRacePreview)}
                    >
                      {genderLabel(shopRacePreview)}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={logout}>
            <LogoutIcon />
            Đăng xuất
          </button>
        </div>
        </div>
      </aside>

      <main className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
