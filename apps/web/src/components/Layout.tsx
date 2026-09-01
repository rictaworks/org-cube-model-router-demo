/** 共通レイアウト（ヘッダーナビゲーション＋コンテンツ領域）。 */
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  faChartColumn,
  faCubes,
  faDatabase,
  faHouse,
  faListCheck,
  faScaleBalanced,
  faSitemap,
  faTableCellsLarge,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { APP_NAME, NAV_LABELS } from '../config/messages.js';
import { ROUTES } from '../config/constants.js';

const NAV_ITEMS = [
  { to: ROUTES.home, label: NAV_LABELS.home, icon: faHouse },
  { to: ROUTES.dimensions, label: NAV_LABELS.dimensions, icon: faSitemap },
  { to: ROUTES.policies, label: NAV_LABELS.policies, icon: faScaleBalanced },
  { to: ROUTES.tasks, label: NAV_LABELS.tasks, icon: faListCheck },
  { to: ROUTES.models, label: NAV_LABELS.models, icon: faDatabase },
  { to: ROUTES.assignments, label: NAV_LABELS.assignments, icon: faCubes },
  { to: ROUTES.changeImpacts, label: NAV_LABELS.changeImpacts, icon: faChartColumn },
  { to: ROUTES.orgView, label: NAV_LABELS.orgView, icon: faTableCellsLarge },
] as const;

export function Layout(): ReactNode {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">
          <FontAwesomeIcon icon={faCubes} aria-hidden="true" />
          <span>{APP_NAME}</span>
        </div>
        <nav className="app-nav" aria-label="メインナビゲーション">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === ROUTES.home} className={({ isActive }) => (isActive ? 'app-nav-link active' : 'app-nav-link')}>
              <FontAwesomeIcon icon={item.icon} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
