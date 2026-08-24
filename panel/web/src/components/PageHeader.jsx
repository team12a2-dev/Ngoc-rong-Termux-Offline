import { useLocation } from 'react-router-dom';
import NavIcon from './NavIcon';
import { getPageIcon } from '../pageMeta';

export default function PageHeader({ title, description, icon, children, stats }) {
  const { pathname } = useLocation();
  const iconName = icon || getPageIcon(pathname);

  return (
    <header className="page-header">
      <div className="page-header-main">
        <div className="page-header-icon" aria-hidden="true">
          <NavIcon name={iconName} />
        </div>
        <div className="page-header-text">
          <h2>{title}</h2>
          {description && <p className="page-desc">{description}</p>}
        </div>
      </div>
      {(stats || children) && (
        <div className="page-header-side">
          {stats && <div className="page-header-stats">{stats}</div>}
          {children && <div className="page-header-actions">{children}</div>}
        </div>
      )}
    </header>
  );
}
